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

// Body parsing
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/**
 * - L'ensemble des requêtes vers la BDD sont effectuées en cascade afin déviter l'utilisation de système asynchrone tel que async/await ou les "promise"
 * - Les dates sont au format yyyy-mm-dd car la BDD utilise se format pour stocker des dates. De même pour le client (input type="date").
 */

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    next();
});

 /**
  * Récupère l'ensemble des tâches, et les retourne sous la forme d'un objet JSON
  * Méthode : GET
  * Exemples de requêtes :
  *     localhost/task/category => Retourn l'ensemble des tâches non achevées et non annulées qui ne sont pas arrivées à échéance.
  *     localhost/task/category/web => Retourn l'ensemble des tâches avec pour tags "web"
  *     localhost/task/category/all => Retourn l'ensemble des tâches existantes
  */
app.get('/task/category/:category?', async (req,res) => {
    // Le "?" après "category" permet de définir que la catégorie est optionnelle 

    // Création d'un nouveau service permettant de retourner plusieurs tâches à la fois 
    const category = req.params.category;

    let request = `SELECT task.id, title, dateBegin, dateEnd, taskState, category AS tags 
        FROM task LEFT OUTER JOIN (SELECT id, GROUP_CONCAT(category) as category FROM link GROUP BY id) AS link ON link.id=task.id `

    // Si aucune catégorie n'est passée via GET, retourne l'ensemble des tâches non annulées et non achevées toujours actives 
    if (category == undefined) {
        request += `WHERE taskState NOT IN ('finished','cancelled') AND dateEnd >= CURDATE();`;
    } else if (category == 'all') {
        request += ';';
    } else {
        request += `WHERE link.category LIKE '%${category}%';`
    }

    // Récupère l'ensemble des ces tâches 
    await dbQuery(request).then((result) => {
        
        let jsonTaskList = result.length != 0 ? result : [];        
        
        // Corrige l'objet JSON obtenue pour qu'il soit conforme aux attentes
        jsonTaskList.forEach(task => {
    
            if (task['tags'] == null) {
                task['tags'] =[]
            } else {
                task['tags'] = task['tags'].split(',');
            }
            task['dateBegin'] = dateFormat(task['dateBegin'], "yyyy-mm-dd");
            task['dateEnd'] = dateFormat(task['dateEnd'], "yyyy-mm-dd");
        });
    
        res.send(jsonTaskList);

    }).catch((error) => {
        manageSqlError(res,error);
    })

})
 /**
  * Récupère une tâche grâce à son ID et la retourne sous la forme d'un objet JSON
  * Méthode : GET
  * Exemple de requête :
  *     localhost/task/id/1 => Retourn la tâche avec pour ID 1
  */
.get('/task/id/:id',async (req,res) => {

    // Récupère l'ID dans l'URL
    const taskId = parseInt(req.params.id);

    // Vérifie si le paramète ID est bien un nombre
    if ( !isNaN(taskId) ) {

        let request = `SELECT task.id, title, dateBegin, dateEnd, taskState, category AS tags 
            FROM task LEFT OUTER JOIN (SELECT id, GROUP_CONCAT(category) as category FROM link GROUP BY id) AS link ON link.id=task.id WHERE task.id=${taskId};`

        // Récupère la tâche lié à cet ID
        await dbQuery(request).then((result) => {

            
            if (result.length == 0) {
                res.status(400).send('Invalid task ID');
            } else {
                let task = result[0]

                task['dateBegin'] = dateFormat(task['dateBegin'], "yyyy-mm-dd");
                task['dateEnd'] = dateFormat(task['dateEnd'], "yyyy-mm-dd");
                task['tags'] = task['tags'].split(',');
                
                // Envoie la tâche sous la forme d'un objet JSON
                res.send(task);
            }

        }).catch((error) => {
            manageSqlError(res,error);
        })


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
.post('/task',async (req, res) => {

    // Récupère l'élément JSON passé en paramètre de la requête
    const task = req.body;

    // Si l'élement JSON est bein formé, ajoute la tâche en BDD
    if (isValidJsonTask(req.body)) {


        let insertTask = `INSERT INTO task (title, dateBegin, dateEnd, taskState) 
        VALUES ('${task.title}', '${task.dateBegin}', '${task.dateEnd}', '${task.state}');`
    
        let taskID;
        await dbQuery(insertTask).then((result) => {
            // Récupère l'ID de tâche généré automatique par la BDD 
            taskID = result.insertId;
        }).catch((error) => {
            manageSqlError(res,error);
            // Si il ya une erreure, ne fait pas la suite
            return;
        })

        // Liste des tuples à ajouter à la table "link" de la BDD
        let listRowValue = []

        // new Set(task.tags) : Transforme une liste en Set afin de supprimer les doublons
        new Set(task.tags).forEach(element => {
            listRowValue.push(`(${taskID}, '${element}')`);
        });

        let insertLink = `INSERT INTO link VALUES ${listRowValue.join(',')} ;`

        if (listRowValue.length != 0) {
            await dbQuery(insertLink).catch((error) => {
                manageSqlError(res,error);
                return;
            })
        }

        res.send('Task launched');

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
.delete('/task/:id', async (req,res) => {



    // Récupère l'ID dans l'URL
    const taskId = parseInt(req.params.id);

    // Vérifie si le paramète ID est bien un nombre
    if ( !isNaN(taskId) ) {

        // Supprime la tâche lié à cet ID
        await dbQuery(`DELETE FROM task WHERE id=${taskId};`).then((result) => {
            res.send('Task deleted');
        }).catch((error) => {
            manageSqlError(res,error);
        })


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
.put('/task/:id',async (req,res) => {

    // Récupère l'élément JSON, passé en paramètre POST, ainsi que l'ID de la tâche à modifier, passé en paramètre GET
    const task = req.body;
    const taskId = parseInt(req.params.id);

    // Si l'élément JSON est bien formé => mettre à jour la tâche
    if (isValidJsonTask(req.body) && !isNaN(taskId)) {

        // Met à jour le tuple de la table "task" lié à l'ID passé en paramètre  
        const updateTask = `UPDATE task SET title='${task.title}', dateBegin='${task.dateBegin}',
         dateEnd='${task.dateEnd}', taskState = '${task.state}' WHERE id = ${taskId};`;

        await dbQuery(updateTask).catch((error) => {
            manageSqlError(res,error);
            return;
        })

        let listDeleteCategories = [];
        let listAddCategories = [];

        // Retourne l'ensemble des catégories de taskId 
        const selectLink = `SELECT category FROM link WHERE id=${taskId};`;

        await dbQuery(selectLink).then((result) => {
            let listCategories= [];
            result.forEach(e => {
                listCategories.push(e.category);
            })

            // Récupère la liste des catégories n'étant plu affecté à la tâche (listDeleteCategory)
            // Récupère la liste des catégories à affecté à la tâche (listAddCategory)
            listDeleteCategories = listCategories.filter(x => !task.tags.includes(x));
            listAddCategories = task.tags.filter(x => !listCategories.includes(x));


        }).catch((error) => {
            manageSqlError(res,error);
            return;
        })

        // S'il y a des catégories à supprimer => les supprimes
        if (listDeleteCategories.length != 0) {
            listDeleteCategories.forEach((e,id,currentArray) => {
                currentArray[id] = '"' + e + '"';
            });

            const deleteLink = `DELETE FROM link WHERE id=${taskId} AND category IN (${listDeleteCategories.join(',')});`;
   
            await dbQuery(deleteLink).catch((error) => {
               manageSqlError(res,error);
               return;
           })
        }

        // S'il y a des catégories à ajotuer => les ajoutes
        if (listAddCategories.length != 0) {
            listAddCategories.forEach((e,id,currentArray) => {
                currentArray[id] = `(${taskId},"${e}")`;
            });
            
            const insetLink = `INSERT INTO link VALUES ${listAddCategories.join(',')};`

            console.log(insetLink)

            await dbQuery(insetLink).catch((error) => {
                manageSqlError(res,error);
                return;
            })
        }

        res.send('Task updated');

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

function manageSqlError(res,err) {
    res.status(500).send("Server Error. Thanks to try again latter");
    console.log(err);
}


function dbQuery(query) {
    return new Promise((resolve, reject) => {
        con.query(query, (error, results, fields) => {
            if(error) {
                reject(error);
            }else {
                resolve(results);
            }
        });
    });
}

