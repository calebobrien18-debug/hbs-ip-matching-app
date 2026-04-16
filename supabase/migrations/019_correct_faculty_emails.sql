-- Correct all faculty email addresses to standard HBS format:
-- [first initial][last name]@hbs.edu  (e.g. Louis Caldera → lcaldera@hbs.edu)
-- Previous seed used a non-standard firstname_lastname format.

update faculty set email = 'jkang@hbs.edu'              where name = 'Jung Koo Kang';
update faculty set email = 'jheese@hbs.edu'             where name = 'Jonas Heese';
update faculty set email = 'jshapiro@hbs.edu'           where name = 'Jesse M. Shapiro';
update faculty set email = 'celkins@hbs.edu'            where name = 'Caroline M. Elkins';
update faculty set email = 'pgompers@hbs.edu'           where name = 'Paul A. Gompers';
update faculty set email = 'tnicholas@hbs.edu'          where name = 'Tom Nicholas';
update faculty set email = 'mbaker@hbs.edu'             where name = 'Malcolm Baker';
update faculty set email = 'jmacomber@hbs.edu'          where name = 'John D. Macomber';
update faculty set email = 'aelberse@hbs.edu'           where name = 'Anita Elberse';
update faculty set email = 'sgupta@hbs.edu'             where name = 'Sunil Gupta';
update faculty set email = 'achan@hbs.edu'              where name = 'Alex Chan';
update faculty set email = 'mnorton@hbs.edu'            where name = 'Michael I. Norton';
update faculty set email = 'lhill@hbs.edu'              where name = 'Linda A. Hill';
update faculty set email = 'bgroysberg@hbs.edu'         where name = 'Boris Groysberg';
update faculty set email = 'rmasanell@hbs.edu'          where name = 'Ramon Casadesus-Masanell';
update faculty set email = 'awu@hbs.edu'                where name = 'Andy Wu';
update faculty set email = 'miansiti@hbs.edu'           where name = 'Marco Iansiti';
update faculty set email = 'aedmondson@hbs.edu'         where name = 'Amy C. Edmondson';
update faculty set email = 'klakhani@hbs.edu'           where name = 'Karim R. Lakhani';
update faculty set email = 'fzhu@hbs.edu'               where name = 'Feng Zhu';
