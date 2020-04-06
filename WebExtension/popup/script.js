
/**
 * Récupère l'ensemble des tâches encore actives 
 * Retourne une Promise 
 */
function getTasks() {
    return new Promise ((resolve, reject) => {
        
        var httpRequest = new XMLHttpRequest();
        const url = "http://localhost:8080/task/category/";
        httpRequest.open("GET", url,true);
        httpRequest.send();
        httpRequest.onreadystatechange = function () {
            if (httpRequest.readyState === 4) {
                if (httpRequest.status === 200) {
                    const json = JSON.parse(httpRequest.responseText);
                    resolve(json);
                } else {
                    console.log(httpRequest.responseText)
                    reject(httpRequest.responseText)
                }
            }
        };

    })
};

/**
 * Ajoute les tâches au tableau et affecte une action au bouton "Delete"
 */
function setTable() {
    getTasks().then(tasks => {

        const table = document.getElementById("taskTabel");

        tasks.forEach(element => {
            const row = table.insertRow(-1);

            var title = document.createElement('TD');
            title.innerHTML = element.title;
            row.appendChild(title);
                
            var dateEnd = document.createElement('TD');
            dateEnd.innerHTML = element.dateEnd;
            row.appendChild(dateEnd);

            var buttons = document.createElement('TD');
            buttons.innerHTML = `<button type="button" data-id="${element.id}" class="deleteBtn">Delete</button>`;
            row.appendChild(buttons)
        });

        setOnclickBtn();

    }).catch(err => {
        console.log(err)
    })
}

/**
 * Affiche une copie locale de la page de gestion des tâches
 */
function goToTaskManager() {
    console.log("HERE")
    window.open("../resources/Client/client.html")
}

/**
 * Affecte un comportement à l'événement "onclick" des boutons "deleteBtn"
 */
function setOnclickBtn() {
    Array.from(document.getElementsByClassName("deleteBtn")).forEach((e) => {
        e.onclick = deleteTask;
    });
}

/**
 * Supprime la tâche liée au bouton actionné 
 */
function deleteTask() {

    const taskID = event.srcElement.getAttribute('data-id');

    var httpRequest = new XMLHttpRequest();
    const url = "http://localhost:8080/task/" + taskID; 
    httpRequest.open("DELETE", url,true);
    httpRequest.send();
    httpRequest.onreadystatechange = function () {
        if (httpRequest.readyState === 4) {
            if (httpRequest.status === 200) {
                setTable();
            } 
        }
    };
}

/**
 * Au chargement de la page, rempli le tableau
 */
window.onload = setTable();

/**
 * Affecte un comportement au bouton "Go To Task Manager"
 */
document.getElementById("b1").onclick = goToTaskManager;