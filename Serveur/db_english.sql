-- mysql -u USERNAME -p
-- SHOW TABLES;
-- SELECT * FROM tache;
-- DELETE FROM tache WHERE id=1;
-- SELECT * FROM lien as L1 LEFT OUTER JOIN lien as L2 ON L1.id = L2.id WHERE L1.categorie="web";
-- UPDATE tache SET title = '49 Rue Ameline', dateBegin = 'Saint-Eustache-la-Forêt', dateEnd = 'Saint-Eustache-la-Forêt', statut = '76210' WHERE id = 2;
-- INSERT INTO lien VALUES (1,'test'), (2,'test'), (3,'test');

CREATE DATABASE IF NOT EXISTS API_PERROT;
USE API_PERROT;
DROP TABLE IF EXISTS link;
DROP TABLE IF EXISTS tag;
DROP TABLE IF EXISTS task;

CREATE TABLE task
(
    id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    title VARCHAR(100),
    dateBegin DATE,
    dateEnd DATE,
    taskState VARCHAR(255),
    CONSTRAINT `tache_check_state_value` CHECK (taskState IN ('running','finished','cancelled','unknow','task requested') )
);

INSERT INTO task (title, dateBegin, dateEnd, taskState) VALUES ('First Task', '2020-03-26', '2021-03-27', 'running');
INSERT INTO task (title, dateBegin, dateEnd, taskState) VALUES ('Second Task', '2020-03-26', '2021-03-27', 'finished');
INSERT INTO task (title, dateBegin, dateEnd, taskState) VALUES ('Third Task', '2020-03-26', '2021-03-27', 'cancelled');

CREATE TABLE tag
(
    category VARCHAR(100) PRIMARY KEY  NOT NULL
);

INSERT INTO tag VALUES ('other');
INSERT INTO tag VALUES ('test');
INSERT INTO tag VALUES ('web');
INSERT INTO tag VALUES ('work');
INSERT INTO tag VALUES ('youpi');

CREATE TABLE link
(
    id INT NOT NULL,
    category VARCHAR(100),
    FOREIGN KEY (id) REFERENCES task(id) ON DELETE CASCADE,
    FOREIGN KEY (category) REFERENCES tag(category)
);

INSERT INTO link VALUES (1,'web');
INSERT INTO link VALUES (1,'work');
INSERT INTO link VALUES (1,'other');
INSERT INTO link VALUES (1,'youpi');
INSERT INTO link VALUES (1,'test');

INSERT INTO link VALUES (2,'web');
INSERT INTO link VALUES (2,'other');
INSERT INTO link VALUES (2,'test');

INSERT INTO link VALUES (3,'work');