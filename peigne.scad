/* 
   Peigne modulaire pour queues droites — dimensions en mm.
   
   Par Gnieark 2026,  https://blog-du-grouik.tinad.fr/
   distribué sous Gnieark's licence V1.0 
   
   La cale fixe dans l'encoche permet de decaler le peigne de largeur_queue.
*/

/* [Guidage] */
largeur_queue = 20;
diametre_fraise = 12;
diametre_bague = 24.6;
nombre_dents = 3;
// Longueur droite des doigts du gabarit, hors bout arrondi.
// Ce parametre ne regle pas la profondeur de coupe dans le bois.
longueur_queues = 50;
epaisseur = 8;

/* [Raccords puzzle] */
// Jeu normal entre les surfaces male et femelle.
jeu_emboitement = 0.1;
largeur_dos = 40;
profondeur_puzzle = 20;

/* [Calage] */
// Deux butees distantes de 2*largeur_queue, sans jeu lateral.
encoche_calage = true;
// Une seule cale separee est ajoutee au plateau, jamais un second peigne.
ajouter_cale = false;

/* [Fixations] */
trous_fixation = false;
diametre_vis = 4.5;
// Fraisure sur la face superieure ; necessite trous_fixation = true.
fraisure_vis = false;
// Diametre du logement en surface, a adapter a la tete de la vis.
diametre_tete_vis = 9;
// Angle total du cone (90 degres par defaut).
angle_fraisure = 90; // [60:1:120]

/* [Inscriptions] */
inscriptions = true;
profondeur_gravure = 0.6;
// Taille maximale ; reduite automatiquement selon la place disponible.
taille_texte = 3;

/* [Affichage] */
mode = "piece"; // [piece:Une piece, assemblage:Deux pieces emboitees, profil:Profil 2D]

/* [Hidden] */
$fn = 96;
compensation = (diametre_bague-diametre_fraise)/2;
largeur_dent = largeur_queue-2*compensation;
pas = 2*largeur_queue;
longueur_piece = nombre_dents*pas;
racine = longueur_queues+compensation;
// Rayon du raccord d'origine, adapte aux dimensions du dos.
raccord_r = 3.903882032022072;
epsilon = 0.01;
fraisure_active = trous_fixation && fraisure_vis;
profondeur_fraisure = fraisure_active && angle_fraisure>0 && angle_fraisure<180
    ? (diametre_tete_vis-diametre_vis)/(2*tan(angle_fraisure/2)) : 0;

// La profondeur seule recoit le jeu ; les faces laterales sont les references.
profondeur_encoche = 10+jeu_emboitement;
hauteur_dos_utile = largeur_dos-(encoche_calage ? profondeur_encoche : 0);
largeur_cale = max(20,largeur_queue);
// Zone arriere intacte : rester hors de l'enveloppe du raccord femelle.
url_droite = longueur_piece-profondeur_puzzle-jeu_emboitement-3*largeur_queue;
url_a_droite = url_droite>=largeur_queue;
largeur_url = encoche_calage ? (url_a_droite ? url_droite : largeur_queue) : longueur_piece;
centre_url = encoche_calage ? (url_a_droite ? 3*largeur_queue+url_droite/2 : largeur_queue/2) : longueur_piece/2;
function distance_encoche(x) = sqrt(
    pow(max(largeur_queue-x,0,x-3*largeur_queue),2)+
    pow(max(largeur_dos/2-profondeur_encoche,0),2));

assert(!encoche_calage || (hauteur_dos_utile>2 &&
       3*largeur_queue+2<longueur_piece-profondeur_puzzle-jeu_emboitement),
       "Encoche : agrandir le dos / le module, reduire le raccord ou desactiver l'encoche.");
assert(!encoche_calage || !trous_fixation ||
       min([for(x=[longueur_piece/4,3*longueur_piece/4]) distance_encoche(x)])>
       (fraisure_active ? diametre_tete_vis : diametre_vis)/2+1,
       "Encoche trop proche des trous ou fraisures : agrandir le dos ou reduire les diametres.");
assert(!ajouter_cale || (diametre_vis>0 && diametre_vis+2<20),
       "Cale : le diametre de vis doit etre positif et laisser de la matiere dans le carre de 20 mm.");
assert(!inscriptions || largeur_url>4, "Pas assez de place sur la tranche pour l'URL.");

assert(epaisseur>0 && longueur_queues>0 && largeur_queue>0,
       "Les dimensions doivent etre positives.");
assert(diametre_fraise>0 && diametre_bague>=diametre_fraise,
       "La bague doit etre au moins aussi large que la fraise.");
assert(largeur_queue>=diametre_fraise,
       "La fraise ne peut pas usiner une ouverture plus etroite qu'elle.");
assert(largeur_dent>0,
       "Dents impossibles : augmenter largeur_queue ou reduire la bague.");
assert(nombre_dents>=1 && nombre_dents==floor(nombre_dents),
       "nombre_dents doit etre un entier positif.");
assert(largeur_dos>0 && profondeur_puzzle>0 &&
       profondeur_puzzle+2*jeu_emboitement<longueur_piece/2,
       "Raccord puzzle trop profond pour cette piece.");
assert(jeu_emboitement>=0 && jeu_emboitement<min(largeur_dos/20,profondeur_puzzle/4),
       "Jeu puzzle hors limites.");
assert(!trous_fixation || (diametre_vis>0 &&
       diametre_vis+2<min(largeur_dos,longueur_piece/2-profondeur_puzzle-jeu_emboitement)),
       "Pas assez de matiere pour les trous de fixation.");
assert(!fraisure_active || (angle_fraisure>0 && angle_fraisure<180 &&
       diametre_tete_vis>diametre_vis),
       "Fraisure : diametre de tete superieur au trou et angle entre 0 et 180 exclus requis.");
assert(!fraisure_active || (profondeur_fraisure>0 && profondeur_fraisure<epaisseur),
       "Fraisure trop profonde pour cette epaisseur.");
assert(!fraisure_active ||
       diametre_tete_vis+2<min(largeur_dos,longueur_piece/2-profondeur_puzzle-jeu_emboitement),
       "Pas assez de matiere autour des fraisures.");
assert(!inscriptions || (taille_texte>0 && profondeur_gravure>0 &&
       profondeur_gravure<min(epaisseur/4,largeur_dos/10)),
       "Gravure trop profonde ou taille de texte invalide.");
assert(mode=="piece" || mode=="assemblage" || mode=="profil", "Mode inconnu.");

function arc_points(c,r,a,b,n=24) =
    [for(i=[0:n]) [c[0]+r*cos(a+(b-a)*i/n),c[1]+r*sin(a+(b-a)*i/n)]];
// Bord gauche, du bas vers le haut ; raccord arrondi du dessin d'origine.
function bord_puzzle() = let(r=raccord_r) concat(
    [[0,0],[0,5]],
    arc_points([-r,5],r,0,104.0362434679265),
    arc_points([-20+r,10],r,284.0362434679265,180),
    arc_points([-20+r,30],r,180,75.9637565320735),
    arc_points([-r,35],r,255.9637565320735,360),
    [[0,40]]);
function adapte(p) = [p[0]*profondeur_puzzle/20,p[1]*largeur_dos/40];

module languette() {
    polygon(concat([for(p=bord_puzzle()) adapte(p)],
                   [[epsilon,largeur_dos],[epsilon,0]]));
}

module dos() {
    difference() {
        union() {
            square([longueur_piece,largeur_dos]);
            languette();
        }
        // La cavite provient du meme profil que le male.
        translate([longueur_piece,0])
            offset(delta=jeu_emboitement) languette();
        if(encoche_calage)
            translate([largeur_queue,largeur_dos-profondeur_encoche])
                square([2*largeur_queue,profondeur_encoche+epsilon]);
    }
}

module doigts() {
    difference() {
        square([longueur_piece,racine+epsilon]);
        // Les ouvertures debordantes traitent aussi les deux extremites.
        for(i=[-1:nombre_dents-1])
            translate([i*pas+largeur_queue,-diametre_bague-1])
                offset(r=compensation)
                    square([largeur_queue,longueur_queues+diametre_bague+1]);
    }
    for(i=[0:nombre_dents-1])
        translate([largeur_queue/2+i*pas,0]) circle(d=largeur_dent);
}

module profil() {
    difference() {
        union() {
            doigts();
            translate([0,racine]) dos();
        }
        if(trous_fixation)
            for(x=[longueur_piece/4,3*longueur_piece/4])
                translate([x,racine+largeur_dos/2]) circle(d=diametre_vis);
    }
}
// Police a chasse fixe pour adapter la taille sans deformer les caracteres.
// Le coefficient 0.85 reserve une marge sur la largeur de chaque caractere.
module texte_grave(chaine, taille) {
    text(chaine, size=taille, font="DejaVu Sans Mono:style=Book",
         halign="center", valign="center", spacing=1);
}
module gravures() {
    lignes = [str("Ø bague: ",diametre_bague),
              str("Ø fraise: ",diametre_fraise),
              str("largeur queue: ",largeur_queue)];
    diametre_logement = fraisure_active ? diametre_tete_vis : diametre_vis;
    // Zone centrale : entre les vis et hors des raccords lateraux.
    largeur_zone = min(longueur_piece-2*profondeur_puzzle-4,
                      trous_fixation ? longueur_piece/2-diametre_logement-4
                                     : longueur_piece-4);
    assert(largeur_zone>0, "Pas assez de place pour les inscriptions.");
    taille_dessus = min(taille_texte, hauteur_dos_utile/8,
                       largeur_zone/(0.85*max([for(l=lignes) len(l)])));
    for(i=[0:2])
        translate([longueur_piece/2,
                   racine+hauteur_dos_utile/2+(1-i)*2*taille_dessus,
                   epaisseur-profondeur_gravure])
            linear_extrude(height=profondeur_gravure+epsilon)
                texte_grave(lignes[i],taille_dessus);

    url = "https://blog-du-grouik.tinad.fr/";
    taille_url = min(taille_texte,epaisseur/2,
                    (largeur_url-4)/(0.85*len(url)));
    // Face arriere (+Y). Le texte est lisible de l'exterieur, haut vers +Z.
    translate([centre_url,racine+largeur_dos-profondeur_gravure,epaisseur/2])
        rotate([90,0,180])
            linear_extrude(height=profondeur_gravure+epsilon)
                texte_grave(url,taille_url);
}

// Le profil 2D conserve seulement les trous traversants.
// Les fraisures et les gravures sont des operations 3D.
module piece() {
    difference() {
        linear_extrude(height=epaisseur) profil();
        if(inscriptions) gravures();
        if(fraisure_active)
            for(x=[longueur_piece/4,3*longueur_piece/4])
                translate([x,racine+largeur_dos/2,epaisseur-profondeur_fraisure])
                    // Debordement au-dessus pour une soustraction sans face coplanaire.
                    cylinder(h=profondeur_fraisure+epsilon,
                             d1=diametre_vis,
                             d2=diametre_tete_vis+2*epsilon*tan(angle_fraisure/2));
    }
}

// Cale : tete 20x20, languette largeur_queue x 10, trou toujours traversant.
module profil_cale() {
    difference() {
        union() {
            translate([(largeur_cale-20)/2,0]) square([20,20]);
            translate([(largeur_cale-largeur_queue)/2,20])
                square([largeur_queue,10]);
        }
        translate([largeur_cale/2,10]) circle(d=diametre_vis);
    }
}
// Placement sans contact (2 mm) : entre les doigts si possible, sinon comparer
// les deux orientations sur les quatre cotes du plateau et minimiser sa surface.
function surface_plateau(c,modules) =
    (max(modules*longueur_piece,c[0]+c[3])-min(-profondeur_puzzle,c[0]))*
    (max(racine+largeur_dos,c[1]+c[4])-min(-largeur_dent/2,c[1]));
function placement_cale(modules=1) =
    nombre_dents>=2 && largeur_queue+2*compensation>=largeur_cale+4 && longueur_queues>=34
    ? [1.5*largeur_queue-largeur_cale/2,2,0,largeur_cale,30,true]
    : nombre_dents>=2 && largeur_queue+2*compensation>=34 && longueur_queues>=largeur_cale+4
    ? [1.5*largeur_queue-15,2,90,30,largeur_cale,true]
    : let(candidats=[for(a=[0,90]) let(w=a==0 ? largeur_cale : 30,h=a==0 ? 30 : largeur_cale)
        each [[-profondeur_puzzle,racine+largeur_dos+2,a,w,h,false],
              [-profondeur_puzzle,-largeur_dent/2-2-h,a,w,h,false],
              [modules*longueur_piece+2,-largeur_dent/2,a,w,h,false],
              [-profondeur_puzzle-2-w,-largeur_dent/2,a,w,h,false]]],
          surfaces=[for(c=candidats) surface_plateau(c,modules)],
          index=search(min(surfaces),surfaces)[0]) candidats[index];
module cale_placee(modules=1) {
    c=placement_cale(modules);
    translate([c[0]+(c[2]==90 ? 30 : 0),c[1]])
        rotate(c[2]) profil_cale();
}

echo(pas=pas, ouverture=largeur_queue+2*compensation,
     largeur_dent=largeur_dent, longueur_raccordement=longueur_piece,
     decalage_contre_piece=largeur_queue);
if(largeur_dent<4) echo("ATTENTION : doigts de moins de 4 mm, verifier leur rigidite.");
if(mode=="profil") {
    profil();
    if(ajouter_cale) cale_placee();
}
else {
    piece();
    if(ajouter_cale)
        linear_extrude(height=epaisseur) cale_placee(mode=="assemblage" ? 2 : 1);
    if(mode=="assemblage")
        translate([longueur_piece,0,0]) color("orange") piece();
}
