// @ts-check
var express = require('express');
var bodyParser = require('body-parser'); 
var dateFormat = require('dateformat');
var mysql = require('mysql');

var app = express();
var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "admin",
    database : "API_PERROT"
  });

const validCategories = ['other','test','web','work','youpi'];
const validTaskStatus = ['running','finished','cancelled','unknow','task requested']; 

// TODO: Changer les requetes vers la BDD

// Body parsing
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/**
 * - L'ensemble des requêtes vers la BDD sont effectuées en cascade afin déviter l'utilisation de système asynchrone tel que async/await ou les "promise"
 * - Les dates sont au format yyyy-mm-dd car la BDD utilise se format pour stocker des dates. De même pour le client (input type="date").
 */

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); //FIXME: 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    next();
});

 /**
  * Récupère l'ensemble des tâches, et les retourne sous la forme d'un objet JSON
  * Méthode : GET
  * Exemples de requêtes :
  *     localhost/task => Retourn l'ensemble des tâches non achevées et non annulées qui ne sont pas arrivées à échéance.
  *     localhost/task?category=web => Retourn l'ensemble des tâches avec pour tags "web"
  */
app.get('/task', (req,res) => {
    // Création d'un nouveau service permettant de retourner plusieurs tâches à la fois 
    const category = req.query.category;

    // Si aucune catégorie n'est passée via GET, retourne l'ensemble des tâches non annulées et non achevées toujours actives 
    if (category == undefined) {

        // Récupère l'ensemble des ces tâches 
        con.query(`SELECT * FROM task WHERE taskState != 'finished' AND taskState != 'cancelled' AND dateEnd >= CURDATE();`, function (error, results, fields) {
            // En cas d'erreur, répond au client et log l'erreur
            if (error) {
                manageSqlError(res,error);
                return;
            }
            // Si aucune tâche ne correspond aux caractéristiques, retourne un tableau vide
            if (results.length == 0) {
                res.json(results);
                return;
            };

            let taskQueryResult = results;
            
            let listID = [];
            let idToCategories = new Map();

            // Pour chacun des tuples retournés, stocke son ID et initialise un tableau, dans la map "idToCategories", qui servira à stocker ses catégories 
            taskQueryResult.forEach(task => {
                listID.push(task.id);
                idToCategories.set(task.id,[])
            })

            // Récupère les catégories liées aux différentes tâches récupérées précédemment 
            con.query(`SELECT * FROM link WHERE id IN (${listID.join(',')});`, function (error, results, fields) {
                if (error) { 
                    manageSqlError(res,error);
                    return;
                }

                const linkQueryResult = results;
                // Pour chaque tuple, ajoute la catégorie récupérée à la liste stockée dans la map.
                linkQueryResult.forEach(row => {
                    idToCategories.get(row.id).push(row.category);
                });


                // Corrige l'objet JSON obtenue avec la 1er requpête pour y ajoutant les tags liée aux tâches et modifiant le format des dates
                taskQueryResult.forEach(task => {
                    task['tags'] = idToCategories.get(task.id);
                    console.log(task['dateBegin'])
                    task['dateBegin'] = dateFormat(task['dateBegin'], "yyyy-mm-dd");
                    task['dateEnd'] = dateFormat(task['dateEnd'], "yyyy-mm-dd");
                });

                res.send(taskQueryResult);

            });

        });

    // Si une catégorie est passée par paramètre GET (ex : /task?category=web) ...
    } else {
        // Récupère l'ID et les catégories de toutes les tâches ayant pour catégorie la valeur de "category"
        con.query(`SELECT L1.id AS id, L2.category AS category FROM link as L1 LEFT OUTER JOIN link as L2 ON L1.id = L2.id WHERE L1.category="${category}"`,
            (error, results, fields) => {

            if (error) {
                manageSqlError(res,error); 
                return;
            }

            // Si le résultat est vide ou si la catégorie demandée n'existe pas, retourne un élément vide
            if (results.length == 0) {
                res.json(results);
                return;
            };
            
            let linkQueryResult = results;

            let listID = [];
            let idToCategories = new Map();

            // Pour chacun des tuples retournés, stocke son ID et initialise un tableau, dans la map "idToCategories", qui servira à stocker ses catégories 
            linkQueryResult.forEach(row => {
                if (idToCategories.has(row.id)) {
                    idToCategories.get(row.id).push(row.category)
                } else {
                    listID.push(row.id);
                    idToCategories.set(row.id,[row.category])
                }
            })


            // Récupère l'ensemble des tâches par rapport aux différents id obtenues plus tôt
            con.query(`SELECT * FROM task WHERE id IN (${listID.join(',')});`, function (error, results, fields) {
                if (error) {
                    manageSqlError(res,error);
                    return;
                }

                const taskQueryResult = results;
                
                // Corrige l'objet JSON obtenue pour y ajoutant les tags liés aux tâches et modifiant le format des dates
                taskQueryResult.forEach(task => {
                    task['tags'] = idToCategories.get(task.id);
                    task['dateBegin'] = dateFormat(task['dateBegin'], "yyyy-mm-dd");
                    task['dateEnd'] = dateFormat(task['dateEnd'], "yyyy-mm-dd");
                });

                res.send(taskQueryResult);
            });
        });
    }

})
 /**
  * Récupère une tâche grâce à son ID et la retourne sous la forme d'un objet JSON
  * Méthode : GET
  * Exemple de requête :
  *     localhost/task/1 => Retourn la tâche avec pour ID 1
  */
.get('/task/:id',(req,res) => {

    // Récupère l'ID dans l'URL
    const taskId = parseInt(req.params.id);

    // Vérifie si le paramète ID est bien un nombre
    if ( !isNaN(taskId) ) {

        // Récupère la tâche lié à cet ID
        con.query(`SELECT * FROM task WHERE id=${taskId};`, function (error, results, fields) {
            if (error) {
                manageSqlError(res,error);
                return;
            } 

            // Si cet ID ne correspond à aucune tâche => retourne une erreur 
            if (results.length == 0) {
                res.status(400).send('Invalid task ID');

            // Sinon : récupère l'ensemble de ses tags pour les ajoutes dans l'objet JSON et corrige le format des dates  
            } else {

                let taskJSON = results[0];

                con.query(`SELECT category FROM link WHERE id=${taskId};`, function (error, results, fields) {
                    if (error) {
                        manageSqlError(res,error);
                        return;
                    } 

                    let listTags = [];
                    results.forEach(element => {
                        listTags.push(element.category);
                    });
                    taskJSON['dateBegin'] = dateFormat(taskJSON['dateBegin'], "yyyy-mm-dd");
                    taskJSON['dateEnd'] = dateFormat(taskJSON['dateEnd'], "yyyy-mm-dd");
                    taskJSON['tags'] = listTags;
                    
                    // Envoie la tâche sous la forme d'un objet JSON
                    res.send(taskJSON);
                });

            }

        });

    // Si l'ID n'est pas un nombre, retourne une erreur 400 : "Bad Request". 
    } else {
        res.status(400).send('Invalid task ID');
    }
})
 /**
  * Ajoute une tâche dans la BDD grâce à un fichier JSON passé dans le corps de la requête 
  * Méthode : POST
  * Exemple de requête :
  *     localhost/task + JSON => permet d'ajouter une tâche à la BDD
  * Exemple JSON :  
  * {
  *     "title":"title",
  *     "dateBegin":"20/03/2018",
  *     "dateEnd":"11/04/2018",
  *     "state":"En cours",
  *     "tags":["web"]
  * }
  */
.post('/task',(req, res) => {

    // Récupère l'élément JSON passé en paramètre de la requête
    const task = req.body;

    // Si l'élement JSON est bein formé, ajoute la tâche en BDD
    if (isValidJsonTask(req.body)) {

        con.query(
            `INSERT INTO task (title, dateBegin, dateEnd, taskState) 
            VALUES ('${task.title}', '${task.dateBegin}', '${task.dateEnd}', '${task.state}');`,
            function (error, results, fields) {
                
            if (error) {
                manageSqlError(res,error);
                return;
            } 

            // Récupère l'ID de tâche généré automatique par la BDD 
            const taskId = results.insertId;

            // Liste des tuples à ajouter à la table "link" de la BDD
            let listRowValue = []
            
            // Tolèrent sur les tags. Peut contenir plusieurs fois le même tag
            // new Set(task.tags) : Transforme une liste en Set afin de supprimer les doublons
            new Set(task.tags).forEach(element => {
                listRowValue.push(`(${taskId}, '${element}')`);
            });

            // Si la liste n'est pas vide, ajouter les éléments à la table, puis, dans tous les cas, envoyer la réponse au client
            // Peut ajouter plusieurs tuples à la fois dans la BDD.
            if (listRowValue.length != 0 ) {
                con.query(`INSERT INTO link VALUES ${listRowValue.join(',')} ;`, function (error, results, fields) {
                    if (error) {
                        manageSqlError(res,error);
                        return;
                    } 
                    res.send('Task launched');
                });
            } else {
                res.send('Task launched');
            }

        });

    // Si l'élement JSON est mal formé, retourne une erreur 400 : "Bad Request".  
    } else {
        res.status(400).send('Invalid JSON object');
    }

})
 /**
  * Supprime une tâche déjà existante 
  * Méthode : DELETE
  * Exemple de requête :
  *     localhost/task/1 => Supprime la tâche avec pour ID 1
  */
.delete('/task/:id',(req,res) => {

    // Récupère l'ID dans l'URL
    const taskId = parseInt(req.params.id);

    // Vérifie si le paramète ID est bien un nombre
    if ( !isNaN(taskId) ) {

        // Supprime la tâche lié à cet ID
        con.query(`DELETE FROM task WHERE id=${taskId};`, function (error, results, fields) {
            if (error) {
                manageSqlError(res,error);
                return;
            }
            res.send('Task deleted');
        });

    // Si l'ID n'est pas un nombre => retourne une erreur 400 : "Bad Request". 
    } else {
        res.status(400).send('Invalid task ID');
    }

})
 /**
  * Modifie une tâche déjà existante grâce au fichier JSON passé dans le corps de la requête 
  * Méthode : PUT
  * Exemple de requête :
  *     localhost/task/1 + JSON => Permet de modifier une tâche déjà existant
  * Exemple JSON :  
  * {
  *     "title":"title",
  *     "dateBegin":"20/03/2018",
  *     "dateEnd":"11/04/2018",
  *     "state":"En cours",
  *     "tags":["web"]
  * }
  */
.put('/task/:id',(req,res) => {

    // Récupère l'élément JSON, passé en paramètre POST, ainsi que l'ID de la tâche à modifier, passé en paramètre GET
    const task = req.body;
    const taskId = parseInt(req.params.id);

    // Si l'élément JSON est bien formé => mettre à jour la tâche
    if (isValidJsonTask(req.body) && !isNaN(taskId)) {

        // Met à jour le tuple de la table "task" lié à l'ID passé en paramètre  
        con.query( 
            `UPDATE task 
            SET title='${task.title}', dateBegin='${task.dateBegin}', 
                dateEnd='${task.dateEnd}', taskState = '${task.state}' 
            WHERE id = ${taskId};`,
            (error, results, fields) => {
            
            if (error) {
                manageSqlError(res,error);
                return;
            }

            // Retourne l'ensemble des catégories de taskId 
            con.query(`SELECT category FROM link WHERE id=${taskId};`, function (error, results, fields) {
                if (error) {
                    manageSqlError(res,error);
                    return;
                } 

                // Récupère ses catégories et les ajoute au tableau "listCategories"
                let listCategories= [];
                results.forEach(e => {
                    listCategories.push(e.category);
                })

                // Récupère la liste des catégories n'étant plu affecté à la tâche (listDeleteCategory)
                // Récupère la liste des catégories à affecté à la tâche (listAddCategory)
                let listDeleteCategories = results.length == 0 ? [] :  listCategories.filter(x => !task.tags.includes(x));
                let listAddCategories = results.length == 0 ? [] : task.tags.filter(x => !listCategories.includes(x));

                // S'il y a des catégories à supprimer => les supprimes
                if (listDeleteCategories.length != 0) {

                    // Formate les catégories pour pouvoir les ajouter à la requête
                    let deleteCategories = [];
                    listDeleteCategories.forEach(e => {
                        deleteCategories.push(`"${e}"`);
                    });
    
                    // Supprime les tuples de la table "link" inutiles.
                    con.query(`DELETE FROM link WHERE id=${taskId} AND category IN (${deleteCategories.join(',')});`, function (error, results, fields) {
                        if (error) {
                            manageSqlError(res,error);
                            return;
                        } 
    
                        // S'il y a des catégories à ajotuer, les ajoutes
                        if (listAddCategories.length != 0 ) {
                            insertLinkTabel(res, taskId, listAddCategories);
                           
                        // Sinon répondre au client
                        } else {
                            res.send('Task updated');
                        }  
                    });

                // Sinon S'il y a des catégories à ajotuer, les ajoutes
                } else if (listAddCategories.length != 0) {

                    insertLinkTabel(res, taskId, listAddCategories);

                // Sinon répondre au client
                } else {
                    res.send('Task updated');
                }


            });
        });

    // Si l'élément JSON est mal formé, retourne une erreur 400 : "Bad Request".  
    } else {
        res.status(400).send( isNaN(taskId) ? 'Invalid task ID' : 'Invalid JSON object');
    }


});

// Lancement du serveur
app.listen(8080, (err) => {
    if (err) throw err;
    console.log('Server launched');
});

// Connection à la BDD
con.connect((err) => {
    if (err) throw err;
    console.log("Connected!");
});

/**
 *********************
 * USEFULL FUNCTIONS *
 *********************
**/

 // Verifie que l'objet JSON est valide
function isValidJsonTask(jsonTask) {

    return jsonTask != undefined 
        && Object.keys(jsonTask).length == 5 
        && jsonTask.title != undefined
        && jsonTask.dateBegin != undefined 
        && jsonTask.dateEnd != undefined 
        && jsonTask.state != undefined 
        && jsonTask.tags != undefined
        && validTaskStatus.indexOf(jsonTask.state) != -1
        && jsonTask.tags.filter(x => !validCategories.includes(x)).length == 0
        && isValidDate(jsonTask.dateBegin)  
        && isValidDate(jsonTask.dateEnd)  
}

// Verifie si la date à bien le format suivant : JJ/MM/AAAA
function isValidDate(stringDate) {
    const listElement = stringDate.split("-");
    return listElement.length == 3 && (parseInt(listElement[2]) <= 31 && parseInt(listElement[1]) <= 12 && !isNaN(parseInt(listElement[0])));
}


function insertLinkTabel(res, taskId, listCategory) {
    // Met en forme les éléments à ajouter à la table "lien"
    let addCategory = [];
    listCategory.forEach(e => {
        addCategory.push(`(${taskId},"${e}")`);
    });

    //Ajoute les nouveaux liens
    con.query(`INSERT INTO link VALUES ${addCategory.join(',')};`, function (error, results, fields) {
        if (error) {
            manageSqlError(res,error);
            return;
        } 
        res.send('Task updated');
    });
}

function manageSqlError(res,err) {
    res.status(500).send("Server Error. Thanks to try again latter");
    console.log(err);
}
