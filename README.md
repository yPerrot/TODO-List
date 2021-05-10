# Projet de gestion de tâche


Projet étudiant de mise en place d'une API Node JS et d'un client interagissant avec.  
Intègre également une WebExtension basique de visualisation des tâches courantes.



## Installation
```js
$ cd Serveur
$ npm install
```


## Configuration 
Modification de la configuration pour l'accès à la BDD
```js 
var con = mysql.createConnection({
    host: "localhost",
    user: /*Mysql_userName*/,
    password: /*Mysql_password*/,
    database : "API_PERROT"
  });
```


## Lancement du serveur 
```js
$ node Serveur/API.js
```



## Accès au Client 
```
Client/client.html
```


## Installation de la WebExtension 
Pour charger temporairement une WebExtension dans Firefox : 
https://developer.mozilla.org/fr/docs/Mozilla/Add-ons/WebExtensions/installation_temporaire_dans_Firefox


Path vers le manifeste de la webExtension : 
```
WebExtension/manifest.json
```


## Améliorations 
* Flexibilité du code en fonction du SGBD utilisé 
* Améliorer la gestion des tags
* Généralisation des "Promise" à l'ensemble du code
* Amélioration de la gestion d'erreur
* Gestion de l'en-tête header 'Access-Control-Allow-Origin'

