function setTabel() {

    // var url_string = "http://www.example.com/t.html?a=1&b=3&c=m2-m3-m4-m5"; //window.location.href
    var url_string = window.location.href
    var category = new URL(url_string).searchParams.get("category");

    document.getElementById("taskFilter").value = category == null ? "running" : category;

    var httpRequest = new XMLHttpRequest();
    const url = "http://localhost:8080/task/category/" + (category != null ? category : "");
    httpRequest.open("GET", url,true);
    httpRequest.send();
    httpRequest.onreadystatechange = function () {
        if (httpRequest.readyState === 4) {
            if (httpRequest.status === 200) {
                const json = JSON.parse(httpRequest.responseText);
                jsonToTable(json);
            } else {
                console.log(httpRequest.responseText)
                alert("Invalid Request, can't get task list.");
            }
        }
    };
};

function jsonToTable(jsonObj) {
    const table = document.getElementById("taskTabel");
                
    for(let i = 0; i < jsonObj.length; i++ ) {
        
        const row = table.insertRow(-1);
        const task = jsonObj[i];

        var id = document.createElement('TD');
        id.innerHTML = task.id;
        row.appendChild(id);
                                    
        var title = document.createElement('TD');
        title.innerHTML = task.title;
        row.appendChild(title);

        var dateBegin = document.createElement('TD');
        dateBegin.innerHTML = task.dateBegin;
        row.appendChild(dateBegin);
        
        var dateEnd = document.createElement('TD');
        dateEnd.innerHTML = task.dateEnd;
        row.appendChild(dateEnd);
        
        var state = document.createElement('TD');
        state.innerHTML = task.taskState;
        row.appendChild(state);

        var tags = document.createElement('TD');
        tags.innerHTML = task.tags.join(',');
        row.appendChild(tags)

        var buttons = document.createElement('TD');
        buttons.innerHTML = 
            `<button type="button" class="btn btn-outline-info" data-toggle="modal" data-target="#modifyModal" 
                data-id="${task.id}" data-title="${task.title}" data-dateBegin="${task.dateBegin}" data-dateEnd="${task.dateEnd}" data-state="${task.taskState}" data-tags="${task.tags.join(',')}"
            onclick="setModifyTaskPopUp()">Modify</button>
            <button type="button" class="btn btn-outline-danger" data-id="${task.id}" onclick="deleteTask()">Delete</button>`;
        row.appendChild(buttons)

    }
};

function deleteTask() {

    const taskID = event.srcElement.getAttribute('data-id');
    
    var httpRequest = new XMLHttpRequest();
    const url = "http://localhost:8080/task/" + taskID; 
    httpRequest.open("DELETE", url,true);
    httpRequest.send();
    httpRequest.onreadystatechange = function () {
        if (httpRequest.readyState === 4) {
            if (httpRequest.status === 200) {
                window.location.reload(true);
                return false;
            } else {
                console.log(httpRequest.responseText)
                alert("Invalid Request, can't delete task");
                window.location.reload(true);
                return false;
            }
        }
    };
}

function addTask() {

    let tags = [];
    if (document.getElementById("tagOther").checked == true) tags.push("\"other\"");
    if (document.getElementById("tagTest").checked == true) tags.push("\"test\"");
    if (document.getElementById("tagWeb").checked == true) tags.push("\"web\"");
    if (document.getElementById("tagWork").checked == true) tags.push("\"work\"");
    if (document.getElementById("tagYoupi").checked == true) tags.push("\"youpi\"");

    let jsonObj = `{
        "title" : "${document.getElementById("taskTitle").value}",
        "dateBegin" : "${document.getElementById("taskDateBegin").value}",
        "dateEnd" : "${document.getElementById("taskDateEnd").value}",
        "state" : "${document.getElementById("taskState").value}",
        "tags" : ${tags.length == 0? "[]" : "[" + tags.join(",") + "]"}
    }`

    var httpRequest = new XMLHttpRequest();
    const url = "http://localhost:8080/task/"; 
    httpRequest.open("POST", url,true);
    httpRequest.setRequestHeader("Content-Type", "application/json");
    httpRequest.send(jsonObj);
    httpRequest.onreadystatechange = function () {
        if (httpRequest.readyState === 4) {
            if (httpRequest.status === 200) {
                window.location.reload(true);
                return false;
            } else {
                console.log(httpRequest.responseText)
                alert("Invalid Request, can't add new task.");
                window.location.reload(true);
                return false;
            }
        }
    };

}

function modifyTask() {
    let tags = [];
    if (document.getElementById("tagOtherM").checked == true) tags.push("\"other\"");
    if (document.getElementById("tagTestM").checked == true) tags.push("\"test\"");
    if (document.getElementById("tagWebM").checked == true) tags.push("\"web\"");
    if (document.getElementById("tagWorkM").checked == true) tags.push("\"work\"");
    if (document.getElementById("tagYoupiM").checked == true) tags.push("\"youpi\"");

    let jsonObj = `{
        "title" : "${document.getElementById("taskTitleM").value}",
        "dateBegin" : "${document.getElementById("taskDateBeginM").value}",
        "dateEnd" : "${document.getElementById("taskDateEndM").value}",
        "state" : "${document.getElementById("taskStateM").value}",
        "tags" : ${tags.length == 0? "[]" : "[" + tags.join(",") + "]"}
    }`

    var httpRequest = new XMLHttpRequest();
    const url = "http://localhost:8080/task/" + document.getElementById("taskIDM").value; 
    httpRequest.open("PUT", url,true);
    httpRequest.setRequestHeader("Content-Type", "application/json");
    httpRequest.send(jsonObj);
    httpRequest.onreadystatechange = function () {
        if (httpRequest.readyState === 4) {
            if (httpRequest.status === 200) {
                window.location.reload(true);
                return false;
            } else {
                alert("Invalid Request, can't modify task.");
                window.location.reload(true);
                return false;
            }
        }
    };
}

function setModifyTaskPopUp(){
    document.getElementById("taskIDM").value = event.srcElement.getAttribute('data-id');
    document.getElementById("taskTitleM").value = event.srcElement.getAttribute('data-title');
    document.getElementById("taskDateBeginM").value = event.srcElement.getAttribute('data-dateBegin');
    document.getElementById("taskDateEndM").value = event.srcElement.getAttribute('data-dateEnd');
    document.getElementById("taskStateM").value = event.srcElement.getAttribute('data-state');

    if(event.srcElement.getAttribute('data-tags').includes("other")) document.getElementById("tagOtherM").checked = true;
    if(event.srcElement.getAttribute('data-tags').includes("test")) document.getElementById("tagTestM").checked = true;
    if(event.srcElement.getAttribute('data-tags').includes("web")) document.getElementById("tagWebM").checked = true;
    if(event.srcElement.getAttribute('data-tags').includes("work")) document.getElementById("tagWorkM").checked = true;
    if(event.srcElement.getAttribute('data-tags').includes("youpi")) document.getElementById("tagYoupiM").checked = true;

}

function filterTask() {
    const category = document.getElementById("taskFilter").value;
    const url = window.location.href.split('?')[0] + (category == "running" ? "" : "?category=" + category);
    document.location.href=url;
}
