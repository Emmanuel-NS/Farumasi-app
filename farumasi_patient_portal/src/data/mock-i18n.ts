/**
 * Multilingual overrides for dynamic mock content.
 * English is already in mock.ts (the base). This file provides rw / fr / sw.
 *
 * Usage:  see useLocalizedNotification / useLocalizedArticle / useLocalizedMedicine
 *         hooks exported at the bottom of src/lib/translations.ts
 */

import type { LangCode } from "@/store/language-store";

type L3 = { rw: string; fr: string; sw: string };

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
type NotifI18n = { title: L3; message: L3 };

export const notifI18n: Record<number, NotifI18n> = {
  1: {
    title: {
      rw: "Amakuru y'Itumba",
      fr: "Mise à jour de commande",
      sw: "Habari ya Agizo",
    },
    message: {
      rw: "Itumba ryanyu ORD-7829X riratumwa! Umushoferi Jean-Paul ari mu nzira.",
      fr: "Votre commande ORD-7829X est en cours de livraison ! Jean-Paul est en route.",
      sw: "Agizo lako ORD-7829X liko njiani! Dereva Jean-Paul yuko njiani.",
    },
  },
  2: {
    title: {
      rw: "Inama y'Ubuzima wa Uyu Munsi",
      fr: "Conseil Santé du Jour",
      sw: "Ushauri wa Afya wa Leo",
    },
    message: {
      rw: "Kunywa amazi ahagije bifasha indyoshya zawe gukora neza. Gerageza inzome 8 buri munsi.",
      fr: "S'hydrater aide vos reins à mieux fonctionner. Visez 8 verres d'eau par jour.",
      sw: "Kunywa maji husaidia figo zako kufanya kazi vizuri. Lenga glasi 8 kila siku.",
    },
  },
  3: {
    title: {
      rw: "Iburiko ryo Gushaka Indi Miti",
      fr: "Rappel de Renouvellement",
      sw: "Ukumbusha wa Kujaza Dawa",
    },
    message: {
      rw: "Metformin 850mg yawe iri gurangira. Igihe cyo gusaba impapuro z'umuganga.",
      fr: "Votre Metformin 850mg est presque épuisé. Il est temps de renouveler votre prescription.",
      sw: "Metformin 850mg yako inakwisha. Ni wakati wa kupata dawa zaidi kutoka kwa daktari.",
    },
  },
  4: {
    title: {
      rw: "Igiciro Cyihariye",
      fr: "Offre Spéciale",
      sw: "Ofa Maalum",
    },
    message: {
      rw: "Bonera iseswa rya 10% ku bikoresho bya Vitamini C iki cyumweru. Bigumye ku bisanduku byacu byose byafatanije.",
      fr: "Profitez de 10% de réduction sur les suppléments de Vitamine C cette semaine. Valable dans toutes les pharmacies partenaires.",
      sw: "Pata punguzo la 10% kwenye virutubisho vya Vitamini C wiki hii. Inatumika katika maduka yote ya dawa ya washirika.",
    },
  },
  5: {
    title: {
      rw: "Itumba Ryagezwe",
      fr: "Commande Livrée",
      sw: "Agizo Limefikishwa",
    },
    message: {
      rw: "Itumba ryanyu ORD-7800A ryagezwe neza.",
      fr: "Votre commande ORD-7800A a été livrée avec succès.",
      sw: "Agizo lako ORD-7800A limefikishwa kwa mafanikio.",
    },
  },
  6: {
    title: {
      rw: "Iburiko ry'Umuguzi Mwihuse",
      fr: "Alerte Vente Flash",
      sw: "Arifa ya Uuzaji wa Haraka",
    },
    message: {
      rw: "Ibiciro byihuse ku bitaro byose no ku bikoresho bya Vitamini. Igura rirangira iri joro.",
      fr: "Offres à durée limitée sur les antibiotiques et les vitamines. La vente se termine ce soir à minuit.",
      sw: "Punguzo la muda mfupi kwenye antibiotiki na vitamini. Ofa inaisha usiku wa leo.",
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH ARTICLES
// ─────────────────────────────────────────────────────────────────────────────
type ArticleI18n = {
  title: L3;
  subtitle: L3;
  summary: L3;
  fullContent: L3;
};

export const articleI18n: Record<string, ArticleI18n> = {
  a1: {
    title: {
      rw: "Siyanse y'Ukunywa Amazi",
      fr: "La Science de l'Hydratation",
      sw: "Sayansi ya Kunywa Maji",
    },
    subtitle: {
      rw: "Birenze gusa kunywa amazi.",
      fr: "Bien plus que de l'eau.",
      sw: "Zaidi ya kunywa maji tu.",
    },
    summary: {
      rw: "Impamvu amazi ari intungamubiri ikurura cyane ku bikorwa bya buri munsi by'umubiri wawe no gukinira ubwonko bwawe.",
      fr: "Pourquoi l'eau est le nutriment le plus vital pour les fonctions quotidiennes de votre corps et comment elle affecte votre cerveau.",
      sw: "Kwa nini maji ni kirutubisho muhimu zaidi kwa utendaji wa kila siku wa mwili wako na jinsi yanavyoathiri ubongo wako.",
    },
    fullContent: {
      rw: `Amazi ni ngombwa mu buzima, akora ingano nke ya 60% by'umubiri w'umuuntu mukuru. Selire yose, imitsi, n'ingingo mu mubiri wawe bikeneye amazi kugira ngo bikorere neza.

**Igenzura ry'Ubushyuhe bw'Umubiri**
Amazi abitswe mu nkonge zo hagati y'uruhu aboneka nk'ubukonje igihe umubiri ubyibye. Iyo avapuriwijwe, ubururu bw'umubiri bubangerana.

**Ingufu z'Ingingo**
Igikoresho kimwe n'inyuma, gikoreshwa mu migwa n'imigigo y'umurongo, kirimo amazi nka 80%. Kugabanya amazi igihe kirekire bishobora kugabanya ubushobozi bw'ingingo kugumisha.

**Kongera Imikino**
Kugabanya amazi bigoreka ibikorwa bikurura nka iminota 30. Niba udakanguka amazi, imikino yawe izagira ingaruka.

**Gukumira Inzitira**
Kugabanya amazi bishobora guteza inzitira n'ibibazo bya migareni ku bantu bamwe. Ubushakashatsi bugaragaza ko amazi ashobora kuvura inzitira ku bantu badafite amazi ahagije.`,
      fr: `L'eau est essentielle à la vie, représentant environ 60 % du corps humain adulte. Chaque cellule, tissu et organe a besoin d'eau pour fonctionner correctement.

**Régule la Température Corporelle**
L'eau stockée dans les couches intermédiaires de la peau remonte à la surface sous forme de sueur quand le corps chauffe. En s'évaporant, elle rafraîchit le corps.

**Lubrifie les Articulations**
Le cartilage, présent dans les articulations et les disques de la colonne, contient environ 80 % d'eau. Une déshydratation prolongée peut réduire la capacité d'amortissement.

**Améliore les Performances**
La déshydratation réduit les performances lors d'activités de plus de 30 minutes. Sans hydratation, vos performances physiques en pâtiront.

**Prévient les Maux de Tête**
La déshydratation peut déclencher maux de tête et migraines. Des recherches montrent que boire de l'eau peut soulager les céphalées liées à la déshydratation.`,
      sw: `Maji ni muhimu kwa maisha, yakiwa takriban 60% ya mwili wa mtu mzima. Kila seli, tishu, na chombo katika mwili wako kinahitaji maji kufanya kazi vizuri.

**Hudhibiti Joto la Mwili**
Maji yaliyohifadhiwa kwenye safu za kati za ngozi hutoka kama jasho mwili unapopata joto. Yanapovukizika, yanafanya mwili upoe.

**Kulainisha Viungo**
Cartilage, inayopatikana kwenye viungo na diski za mgongo, ina maji karibu 80%. Upungufu wa maji kwa muda mrefu unaweza kupunguza uwezo wa kuchukua mshtuko.

**Kuimarisha Utendaji**
Upungufu wa maji hupunguza utendaji katika shughuli zaidi ya dakika 30. Bila maji ya kutosha, utendaji wako wa kimwili utaathiriwa.

**Kuzuia Maumivu ya Kichwa**
Upungufu wa maji unaweza kusababisha maumivu ya kichwa na migraine kwa watu wengine. Utafiti unaonyesha maji yanaweza kupunguza maumivu ya kichwa yanayotokana na upungufu wa maji.`,
    },
  },
  a2: {
    title: {
      rw: "Gukora Neza ku Mutwe mu Gusinzira",
      fr: "Maîtriser l'Hygiène du Sommeil",
      sw: "Kuboresha Usafi wa Usingizi",
    },
    subtitle: {
      rw: "Ibanga ry'amasaha 8 y'isinziro ry'irengeye.",
      fr: "Le secret d'un sommeil profond de 8 heures.",
      sw: "Siri ya masaa 8 ya usingizi mzuri.",
    },
    summary: {
      rw: "Gutunganya ibidukikije n'imyitwarire yawe kugira ngo ubone isinziro ry'ubuzimu ry'irengeye.",
      fr: "Optimiser votre environnement et vos habitudes pour un sommeil profond et réparateur.",
      sw: "Kuboresha mazingira yako na tabia kwa usingizi wa kina unaorejesha nguvu.",
    },
    fullContent: {
      rw: `Isinziro rifasha gusubiza umubiri n'ubwonko. Amasaha 7-9 arasabwa ku bakomoka mu bakuru.

**Umwanya w'Igihe Kamere**
Umubiri wawe ufite saa kamere y'igihe. Ikugirira inkunga kuguma maso kandi ibwira umubiri wawe igihe cyo gusinzira.

**Urumuri rwa Blue Light**
Ibikoresho by'ikoranabuhanga bikoresha urumuri rwa blue rikwigisha ubwonko bwawe ko ikizungu giracyaramuka. Gabanya ibikorwa byo kurebesha nibura amasaa 1 mbere yo kuryama.

**Kafeyin**
Iyo iferwa nyuma y'umunsi, kafeyin iterera umubiri wawe kandi ishobora guhagarika umubiri wawe kuruhuka nijoro.`,
      fr: `Le sommeil permet de restaurer le corps et l'esprit. 7 à 9 heures sont recommandées pour les adultes.

**Le Rythme Circadien**
Votre corps possède une horloge naturelle. Elle vous aide à rester éveillé et indique à votre corps quand dormir.

**Exposition à la Lumière Bleue**
Les appareils électroniques émettent une lumière bleue qui trompe votre cerveau en lui faisant croire qu'il fait encore jour. Limitez les écrans au moins 1 heure avant le coucher.

**Caféine**
Consommée tard dans la journée, la caféine stimule votre système nerveux et peut empêcher votre corps de se détendre la nuit.`,
      sw: `Usingizi husaidia kuirejesha mwili na akili. Masaa 7-9 yanashauriwa kwa watu wazima.

**Mdundo wa Circadian**
Mwili wako una saa ya asili ya kuweka muda. Inakusaidia kukaa macho na kumwambia mwili wako wakati wa kulala.

**Mwanga wa Bluu**
Vifaa vya kielektroniki hutoa mwanga wa buluu unaodanganya ubongo wako kufikiri bado ni mchana. Punguza matumizi ya skrini angalau saa 1 kabla ya kulala.

**Kafeini**
Ikiwa imetumika mwishoni mwa siku, kafeini huchochea mfumo wako wa neva na inaweza kuzuia mwili wako kupumzika usiku.`,
    },
  },
  r1: {
    title: {
      rw: "Gukira Ibicurane n'Inkorora",
      fr: "Guérison de la Grippe et du Rhume",
      sw: "Kupona Mafua na Homa ya Kawaida",
    },
    subtitle: {
      rw: "Uburyo bwo Kurwanya Virusi",
      fr: "Protocole de Défense Virale",
      sw: "Itifaki ya Kujilinda dhidi ya Virusi",
    },
    summary: {
      rw: "Uburyo bwemejwe n'ubumenyi bwo gupfunyura igihe cyo gukira.",
      fr: "Méthodes naturelles scientifiquement prouvées pour raccourcir le temps de guérison.",
      sw: "Njia za asili zinazothibitishwa kisayansi kupunguza muda wa kupona.",
    },
    fullContent: {
      rw: `Indwara y'ibicurane ni ubudahwema bw'inkorora butera ingaruka ku ngingo zo guhumeka. Isinziro ni ingenzi cyane, ariko uburyo bw'ibirodomo bushobora gufasha gukira.

**Ubuki n'Icyayi**
Ubuki ni imiti y'ibirodomo y'inkorora. Shyiramo ibikombe 2 bya ubuki mu cyayi gishyushye cyangwa amazi ashyushye n'irori.

**Gusuka Umwuka w'Ibiruhe**
Gusuka umwuka w'ibiruhe bifasha gutema inzoga no gusukura ingingo zo guhumeka. Shyiramo amazi ashyushye mu kireri, swira inkereje ku mutwe wawe, uhume cyane iminota 5-10.

**Zinc**
Ubushakashatsi bugaragaza ko Zinc ishobora gufinya igihe cy'inkorora niba ifashwe mu masaa 24 nyuma y'ibimenyetso.`,
      fr: `La grippe est une infection virale qui attaque votre système respiratoire. Le repos est primordial, mais ces méthodes naturelles peuvent soutenir la guérison.

**Miel et Thé**
Le miel est un suppresseur de toux naturel. Mélangez 2 cuillères de miel dans une tisane ou de l'eau chaude citronnée.

**Inhalation de Vapeur**
Inhaler de la vapeur aide à fluidifier le mucus et à drainer les sinus. Versez de l'eau chaude dans un bol, drapez une serviette sur votre tête et respirez profondément 5-10 minutes.

**Supplémentation en Zinc**
Des recherches suggèrent que les pastilles de zinc peuvent raccourcir la durée d'un rhume si prises dans les 24 heures suivant l'apparition des symptômes.`,
      sw: `Mafua ni maambukizo ya virusi yanayoshambulia mfumo wako wa kupumua. Kupumzika ni muhimu zaidi, lakini njia hizi za asili zinaweza kusaidia kupona.

**Asali na Chai**
Asali ni dawa ya asili ya kukohoa. Changanya vijiko 2 vya asali na chai ya mitishamba au maji ya moto na ndimu.

**Kuvuta Mvuke**
Kuvuta mvuke husaidia kupunguza kamasi na kufuta pua. Mimina maji ya moto kwenye bakuli, funika kichwa chako na taulo, na pumua kwa kina kwa dakika 5-10.

**Virutubisho vya Zinc**
Utafiti unaonyesha vidonge vya zinc vinaweza kupunguza muda wa homa ya kawaida vikitumiwa ndani ya masaa 24 baada ya kuonekana kwa dalili.`,
    },
  },
  r2: {
    title: {
      rw: "Kugenzura Diyabete ku Buryo Kamere",
      fr: "Gestion Naturelle du Diabète",
      sw: "Udhibiti wa Kisukari kwa Njia ya Asili",
    },
    subtitle: {
      rw: "Kugenzura Imibereho",
      fr: "Contrôle par le Style de Vie",
      sw: "Udhibiti wa Mtindo wa Maisha",
    },
    summary: {
      rw: "Uko indyo n'imigenzurire y'umunaniro bigira ingaruka zikomeye ku isukari mu maraso.",
      fr: "Comment l'alimentation et la gestion du stress affectent significativement la glycémie.",
      sw: "Jinsi lishe na udhibiti wa msongo wa mawazo unavyoathiri kwa kiasi kikubwa sukari ya damu.",
    },
    fullContent: {
      rw: `Kugenzura diyabete ya Ubwoko bwa 2 byirangiranye n'imibereho y'ubuzima.

**Indyo y'Imyunyu**
Imyunyu ihoreza imyimenyereze y'ibisukarisu n'ubunyobyo bw'isukari, itera gukomera buhoro kw'isukari mu maraso. Shingaho ku imboga zidafite amafuto menshi, imitobotobo, n'ibinyampeke binoze.

**Inyu y'Iviniga bya Apple**
Ubushakashatsi bugaragaza ko iviniga ya apple itera isukari nke igihe y'inda nzima. Gira umugambi: 1/4 igikombe mu inzome y'amazi mbere y'ifunguro.

**Kugenzura Umunaniro**
Igihe uri mu munaniro, umubiri wawe utanga glucagon na cortisol, biterwa n'isukari mu maraso kukura. Yoga n'ibitekerezo by'amahoro bishobora kunoza ubudasana bwa insuline.`,
      fr: `La gestion du diabète de type 2 repose largement sur le style de vie.

**Alimentation Riche en Fibres**
Les fibres ralentissent la digestion des glucides et l'absorption du sucre, favorisant une montée plus progressive de la glycémie. Privilégiez les légumes non féculents, les légumineuses et les céréales complètes.

**Vinaigre de Cidre de Pomme**
Des recherches montrent qu'il favorise une baisse de la glycémie à jeun. Mélangez 1 c.à.c dans un verre d'eau avant un repas.

**Gestion du Stress**
Sous stress, votre corps libère glucagon et cortisol, faisant monter la glycémie. Le yoga et la pleine conscience peuvent améliorer la sécrétion d'insuline.`,
      sw: `Udhibiti wa kisukari cha aina ya 2 unategemea sana mtindo wa maisha.

**Lishe Yenye Nyuzinyuzi Nyingi**
Nyuzinyuzi hupunguza umeng'enyaji wa wanga na ufyonzwaji wa sukari, kukuza ongezeko la polepole zaidi la sukari ya damu. Zingatia mboga zisizo na wanga, mikunde, na nafaka nzima.

**Siki ya Tufaha**
Utafiti unaonyesha inakuza kupungua kwa sukari ya damu wakati wa kufunga. Changanya kijiko 1 kwenye glasi ya maji kabla ya mlo.

**Udhibiti wa Msongo wa Mawazo**
Ukiwa na msongo, mwili wako hutoa glucagon na cortisol, na kusababisha sukari ya damu kupanda. Yoga na utulivu wa akili vinaweza kuboresha usiri wa insulini.`,
    },
  },
  s1: {
    title: {
      rw: "Gusobanukirwa Uburyo bwo Guteganya Ibyaro",
      fr: "Comprendre la Planification Familiale",
      sw: "Kuelewa Chaguo za Uzazi wa Mpango",
    },
    subtitle: {
      rw: "Amabwiriza y'Ubuzima bw'Inkomoko",
      fr: "Guide de Santé Reproductive",
      sw: "Mwongozo wa Afya ya Uzazi",
    },
    summary: {
      rw: "Isuzuma ryuzuye ry'uburyo bw'ubu bwo guteganya ibyaro.",
      fr: "Un aperçu complet des méthodes modernes de planification familiale.",
      sw: "Muhtasari wa kina wa njia za kisasa za uzazi wa mpango.",
    },
    fullContent: {
      rw: `Guhitamo imiti nziza y'ugukumira gutwita bishingiye ku buzima bwawe, imibereho, n'uko ukeneye kurinda.

**Preservatif**
Itanga kurinda inshuro ebyiri: ugukumira gutwita no kurinda indirimbo zo gucurikiranaho.

**Ibinini n'Inzira z'Imiti**
Uburyo bw'imiti bw'ingero nziza igihe bukoreshwa neza.

**Uburyo Kamere**
Gukurikirana ubuzimu bw'uburinzi bw'imyanya binyuze mu gupima ubushyuhe n'amezi.

Buri gihe baza umuganga w'ubuzima mbere yo gutangira uburyo ubwo aribwo bwose bwo guteganya ibyaro.`,
      fr: `Le choix de la contraception appropriée dépend de votre santé, style de vie et besoins de protection.

**Préservatifs**
Offrent une double protection contre la grossesse et les IST.

**Pilules et Implants**
Méthodes hormonales très efficaces lorsqu'elles sont utilisées correctement.

**Méthodes Naturelles**
Suivi de la fertilité via la température et le cycle.

Consultez toujours un professionnel de santé avant de commencer toute méthode contraceptive.`,
      sw: `Kuchagua udhibiti wa uzazi unaofaa unategemea afya yako, mtindo wa maisha, na mahitaji ya ulinzi.

**Kondomu**
Hutoa ulinzi wa pande mbili dhidi ya ujauzito na magonjwa ya zinaa.

**Vidonge na Implants**
Njia za homoni zenye ufanisi mkubwa zinapotumika vizuri.

**Njia za Asili**
Kufuatilia utasa kupitia joto la mwili na mzunguko.

Daima shauriana na mtoa huduma wa afya kabla ya kuanza njia yoyote ya uzazi wa mpango.`,
    },
  },
  m1: {
    title: {
      rw: "Gukemura Umunaniro w'Akazi",
      fr: "Gérer le Stress au Travail",
      sw: "Kusimamia Msongo wa Mawazo Kazini",
    },
    subtitle: {
      rw: "Ubuzima bw'Ubwonko mu Kazi",
      fr: "Bien-être Mental au Travail",
      sw: "Ustawi wa Kiakili Kazini",
    },
    summary: {
      rw: "Uko kumenya no gukemura kunanirwa mbere y'uko bigira ingaruka ku buzima bwawe.",
      fr: "Comment identifier et gérer l'épuisement avant qu'il n'affecte votre santé.",
      sw: "Jinsi ya kutambua na kusimamia uchovu kabla haujaathiri afya yako.",
    },
    fullContent: {
      rw: `Kunanirwa ni uko umunaniro w'imibereho, umubiri, n'ubwonko utewe n'umunaniro w'inyongera.

**Inama ya 1**: Fata ikiruhuko gito buri iminota 90.

**Inama ya 2**: Shyiraho imipaka ikomeye ku kuboneka hanze y'amasaha y'akazi.

**Inama ya 3**: Vugana neza na bantu bo mu itsinda ryanyu ku mirimo.

**Inama ya 4**: Imereye neza - byibura iminota 5 y'uguhumeka neza ishobora kugabanya cyane imiterere ya imiti y'umunaniro.`,
      fr: `L'épuisement est un état d'épuisement émotionnel, physique et mental causé par un stress excessif.

**Conseil 1** : Faites de petites pauses toutes les 90 minutes.

**Conseil 2** : Fixez des limites claires sur votre disponibilité en dehors des heures de travail.

**Conseil 3** : Communiquez ouvertement avec votre équipe sur les charges de travail.

**Conseil 4** : Pratiquez la pleine conscience — même 5 minutes de respiration concentrée peuvent réduire considérablement les hormones de stress.`,
      sw: `Uchovu ni hali ya msongo wa kihisia, kimwili, na kiakili unaosababishwa na msongo mwingi wa mawazo.

**Ushauri wa 1**: Chukua mapumziko mafupi kila dakika 90.

**Ushauri wa 2**: Weka mipaka wazi ya upatikanaji wako nje ya masaa ya kazi.

**Ushauri wa 3**: Wasiliana wazi na timu yako kuhusu mzigo wa kazi.

**Ushauri wa 4**: Fanya mazoezi ya utulivu wa akili — hata dakika 5 za kupumua kwa makini zinaweza kupunguza sana homoni za msongo.`,
    },
  },
  n1: {
    title: {
      rw: "Kubaka Ifunguro Ryuzuye",
      fr: "Composer une Assiette Équilibrée",
      sw: "Kujenga Sahani ya Usawa",
    },
    subtitle: {
      rw: "Intangiriro z'Indyo Yuzuye",
      fr: "Les Bases d'une Alimentation Saine",
      sw: "Misingi ya Lishe Bora",
    },
    summary: {
      rw: "Intangiriro y'indyo yuzuye isobanurwa mu buryo bworoshye.",
      fr: "Les bases d'une alimentation saine expliquées simplement.",
      sw: "Msingi wa lishe bora umeelezwa kwa urahisi.",
    },
    fullContent: {
      rw: `Intangiriro y'indyo yuzuye ni ifunguro ryuzuye.

Uzuza kimwe cya kabiri cy'isahani yawe n'imboga n'imbuto, igice kimwe cya kane n'inshuro y'ubushobozi, n'igice kimwe cya kane n'ibinyampeke binoze. Irinde amashuli yatunganijwe cyane kugira ngo ubike ingufu zuzuye.

**Intungamubiri Ingenzi Zo Gushingaho:**
- Fer (spinagie, inyama yoroheje, imitobotobo)
- Calcium (amavuta, ibiribwa byongeweho)
- Vitamini D (izuba, inzovu z'amavuta)
- Omega-3 (inzovu, imbuto ya flax, inkwi)`,
      fr: `La base d'une alimentation saine est une assiette équilibrée.

Remplissez la moitié de votre assiette de légumes et fruits, un quart de protéines maigres et un quart de céréales complètes. Évitez les sucres hautement transformés pour maintenir un niveau d'énergie stable.

**Nutriments clés à privilégier :**
- Fer (épinards, viande maigre, légumineuses)
- Calcium (produits laitiers, aliments enrichis)
- Vitamine D (soleil, poissons gras)
- Oméga-3 (poisson, graines de lin, noix)`,
      sw: `Msingi wa lishe bora ni sahani yenye usawa.

Jaza nusu ya sahani yako na mboga na matunda, robo moja na protini nyembamba, na robo moja na nafaka nzima. Epuka sukari zilizosindikwa sana ili kudumisha viwango vya nishati thabiti.

**Virutubisho muhimu vya kuzingatia:**
- Chuma (mchicha, nyama nyembamba, mikunde)
- Kalsiamu (bidhaa za maziwa, vyakula vilivyoimarishwa)
- Vitamini D (jua, samaki wenye mafuta)
- Omega-3 (samaki, mbegu za kitani, karanga)`,
    },
  },
  mb1: {
    title: {
      rw: "Ibyangombwa byo Kwita ku Mugore Yabyaye",
      fr: "Essentiels des Soins Post-partum",
      sw: "Mambo Muhimu ya Huduma ya Baada ya Kujifungua",
    },
    subtitle: {
      rw: "Kwita ku mugore nyuma yo kubyara",
      fr: "Prendre soin de soi après l'accouchement",
      sw: "Kujitunza baada ya kujifungua",
    },
    summary: {
      rw: "Intambwe ingenzi n'ibimenyetso byo kurebera mu gihe cyo gukira nyuma yo kubyara.",
      fr: "Étapes clés et symptômes à surveiller pendant la récupération post-partum.",
      sw: "Hatua muhimu na dalili za kuangalia wakati wa kupona baada ya kujifungua.",
    },
    fullContent: {
      rw: `Gukira nyuma yo kubyara bisaba igihe n'uburinzi. Irinde gusinzira byinshi, kurya neza, no kugenzura ibimenyetso bibabaza.

Buri gihe vugana n'umuganga wawe w'ubuzima ku baterura nyuma yo kubyara, gukira k'umubiri, no muri we yite.

**Inama Ingenzi za Nyuma yo Kubyara:**
- Sinzira igihe umwana asinzira
- Nywa amazi ahagije (cyane cyane niba urononsa)
- Rya ibiribwa birimo ibiryo biruta ruhuke guteza aho maraso
- Shaka inkunga mu mpinduka z'ingengabitekerezo nyuma yo kubyara`,
      fr: `La récupération après l'accouchement prend du temps et de la patience. Assurez-vous de vous reposer suffisamment, de bien manger et de surveiller tout symptôme préoccupant.

Parlez toujours à votre prestataire de soins des saignements post-partum, de la récupération physique et de votre bien-être mental.

**Conseils post-partum essentiels :**
- Dormez quand bébé dort
- Restez hydratée (surtout si vous allaitez)
- Mangez des aliments riches en fer pour reconstituer la réserve sanguine
- Cherchez du soutien pour les changements d'humeur post-partum`,
      sw: `Kupona baada ya kujifungua kunachukua muda na subira. Hakikisha unapumzika sana, unakula vizuri, na kufuatilia dalili zozote zinazosumbua.

Daima zungumza na mtoa huduma wako wa afya kuhusu kutoka damu baada ya kujifungua, kupona kimwili, na ustawi wako wa kiakili.

**Vidokezo muhimu vya baada ya kujifungua:**
- Lala mtoto anapopumzika
- Kunywa maji ya kutosha (hasa ukiwa unaonyonyesha)
- Kula vyakula vyenye chuma kujenga upya hifadhi ya damu
- Tafuta msaada kwa mabadiliko ya hisia baada ya kujifungua`,
    },
  },
  mb2: {
    title: {
      rw: "Ibiribwa bya Mbere by'Umwana Wawe",
      fr: "Premiers Aliments pour Votre Bébé",
      sw: "Vyakula vya Kwanza kwa Mtoto Wako",
    },
    subtitle: {
      rw: "Gutwara umwana ku biribwa byimye",
      fr: "Naviguer la transition vers les solides",
      sw: "Mwongozo wa mpito kwenda vyakula ngumu",
    },
    summary: {
      rw: "Amabwiriza manini ku gihe n'uburyo bwo gutangira guha umwana wawe ibiribwa byimye mu buryo bwizewe.",
      fr: "Un guide rapide sur quand et comment commencer à nourrir votre bébé avec des aliments solides en toute sécurité.",
      sw: "Mwongozo wa haraka kuhusu wakati na jinsi ya kuanza kulisha mtoto wako vyakula ngumu kwa usalama.",
    },
    fullContent: {
      rw: `Ishyirahamwe ry'Abaganga b'Abana rya Amerika risaba gutangira ibiribwa byimye nka amezi 6, igihe umwana agaragaza ibimenyetso by'ingengabitekerezo (nk'uguturika no kwereka kugira inyungu).

Tangira na biribwa bumwe bumwe biterwa kuri karere, nka imboga zihemye cyangwa ibinyampeke binoze birimo ibyuma.

**Ibimenyetso byo Kuba Umwana Arageze:**
- Umwana ashobora guturika n'inkunga nke
- Umwana agaragaza inyungu ku biribwa
- Umwana ashobora gushika imitwe neza
- Gutakaza reflexe y'ururimi`,
      fr: `L'Académie Américaine de Pédiatrie recommande de commencer les aliments solides vers 6 mois, quand le bébé montre des signes de préparation (comme s'asseoir et s'intéresser à la nourriture).

Introduisez un aliment à ingrédient unique à la fois, comme des purées de légumes ou des céréales enrichies en fer.

**Signes de préparation :**
- Le bébé peut s'asseoir avec un soutien minimal
- Le bébé montre de l'intérêt pour la nourriture
- Le bébé peut tenir sa tête bien droite
- Disparition du réflexe de la langue`,
      sw: `Chuo cha Dawa cha Amerika cha Watoto kinashauriwa kuanza vyakula ngumu karibu na miezi 6, mtoto anapoonyesha ishara za utayari (kama kukaa wima na kuonyesha nia).

Anzisha chakula kimoja chenye kiungo kimoja kwa wakati mmoja, kama mboga zilizosagwa au nafaka zilizoimarishwa na chuma.

**Ishara za utayari:**
- Mtoto anaweza kukaa kwa msaada mdogo
- Mtoto anaonyesha nia kwa chakula
- Mtoto anaweza kushikilia kichwa imara
- Kupoteza reflex ya ulimi`,
    },
  },
  dy1: {
    title: {
      rw: "Vitunguru Bidashe n'Ibihaha",
      fr: "Oignons Crus et Poumons",
      sw: "Vitunguu Mbichi na Mapafu",
    },
    subtitle: {
      rw: "Imiti y'ibirodomo ya Kamere",
      fr: "L'Antihistaminique Naturel",
      sw: "Antihistamine ya Asili ya Maumbile",
    },
    summary: {
      rw: "Kurya vitunguru bidashe bishobora gufungura inzira z'uguhumeka bitewe n'ubunyobyo bw'imiti ya Quercetin.",
      fr: "Manger des oignons crus peut aider à dégager les voies respiratoires grâce à leur riche teneur en Quercétine.",
      sw: "Kula vitunguu mbichi kunaweza kusaidia kufungua njia za hewa kwa sababu ya maudhui mengi ya Quercetin.",
    },
    fullContent: {
      rw: `Wari uzi ko kurya vitunguru bidashe bishobora gufasha mu bibazo by'uguhumeka?

**Ubumenyi**
Vitunguru, cyane cyane vitunguru bikundu, ni kimwe mu biribwa biriho cyane Quercetin — imiti ikomeye ya antioxidant flavonoid ikora nk'imiti y'ibirodomo y'ibirodomo.

**Ubushakashatsi**
Ubushakashatsi bugaragaza ko Quercetin ifasha kwongera umuvuduko w'umwuka (bronchodilation), bifasha abantu barwaye asthme cyangwa bronchite.

**Uburyo bwo Kurya**
Kugira ngo ubone ibyiza byinshi, vitunguru bigomba kurya bidashe. Guteka bishobora gukuraho ibintu bimwe.`,
      fr: `Saviez-vous que manger des oignons crus peut aider avec les problèmes respiratoires ?

**La Science**
Les oignons, notamment les oignons rouges, sont l'une des sources alimentaires les plus riches en Quercétine — un puissant flavonoïde antioxydant qui agit comme antihistaminique et anti-inflammatoire naturel.

**La Recherche**
Une étude publiée dans l'American Journal of Physiology a montré que la Quercétine aide à détendre les muscles des voies respiratoires (bronchodilatation), bénéfique pour les personnes souffrant d'asthme ou de bronchite.

**Comment Consommer**
Pour un bénéfice maximal, les oignons doivent être mangés crus. La cuisson peut dégrader certains composés.`,
      sw: `Je, unajua kwamba kula vitunguu mbichi kunaweza kusaidia na matatizo ya kupumua?

**Sayansi**
Vitunguu, hasa vitunguu nyekundu, ni moja ya vyanzo vya juu zaidi vya chakula vya Quercetin — flavonoid yenye nguvu ya antioxidant inayofanya kazi kama antihistamine na wakala wa kuzuia uvimbe wa asili.

**Utafiti**
Utafiti uliochapishwa unaonyesha Quercetin husaidia kupumzisha misuli ya njia za hewa (bronchodilation), ya manufaa kwa watu wanaougua pumu au bronchitis.

**Jinsi ya Kutumia**
Ili kupata faida ya juu, vitunguu vinapaswa kuliwa vibichi. Kupika kunaweza kuharibu baadhi ya misombo.`,
    },
  },
  dy2: {
    title: {
      rw: "Tsinamukungu nk'Imiti",
      fr: "L'Ail comme Antibiotique",
      sw: "Vitunguu Saumu kama Antibiotiki",
    },
    subtitle: {
      rw: "Kurinda kwa Kera",
      fr: "Défense Ancestrale",
      sw: "Ulinzi wa Kale",
    },
    summary: {
      rw: "Tsinamukungu itanga Allicin igihe igandagurwa, imiti ikomeye y'imiti yo gukumira indirimbo.",
      fr: "L'ail libère de l'Alliine lorsqu'il est écrasé, un puissant composé antimicrobien.",
      sw: "Vitunguu saumu hutoa Allicin inapokandwa, kiwanja chenye nguvu cha antimicrobial.",
    },
    fullContent: {
      rw: `Wari uzi ko tsinamukungu yakoreshwaga mu ntambara ya 1 yo ku Isi Yose kuvura gangrene?

**Ubumenyi**
Igihe igikoresho cy'tsinamukungu cigandagurwa cyangwa kirungwa, gitanga ibintu bitwa Allicin. Ibi ni ingamba y'ubwirindagizi kuri selire y'ibiribwa kandi ku bantu bifite imiti ikomeye y'imiti yo gukumira indwara z'indirimbo.

**Ubushakashatsi**
Ubushakashatsi bugaragaza ko tsinamukungu ikorera neza ku ndwara nyinshi z'indirimbo, harimo Salmonella na E. coli.

**Inama**
Reka tsinamukungu igandagurwa ikomeze iminota 10 mbere yo guteka. Ibi bituma imiterere ya Allicin iterwa mu buryo bwuzuye.`,
      fr: `Saviez-vous que l'ail était utilisé pendant la Première Guerre mondiale pour traiter la gangrène ?

**La Science**
Lorsqu'une gousse d'ail est écrasée ou mâchée, elle libère un composé appelé Alliine. Cela sert de mécanisme de défense pour la plante contre les parasites, mais chez l'homme, il a de puissantes propriétés antibactériennes.

**La Recherche**
Des études ont montré que l'ail est efficace contre un large spectre de bactéries, dont Salmonella et E. coli.

**Astuce**
Laissez l'ail écrasé reposer 10 minutes avant de cuisiner. Cela permet à la réaction enzymatique qui crée l'Alliine de se produire pleinement.`,
      sw: `Je, unajua vitunguu saumu vilitumika katika Vita vya Kwanza vya Dunia kutibu gangrene?

**Sayansi**
Kitunguu saumu kinapokandwa au kutafunwa, hutoa kiwanja kinachoitwa Allicin. Hii hutumika kama utaratibu wa ulinzi kwa mmea dhidi ya wadudu, lakini kwa binadamu ina sifa zenye nguvu za kuua bakteria.

**Utafiti**
Masomo yanaonyesha vitunguu saumu kuwa na ufanisi dhidi ya wigo mpana wa bakteria, ikiwemo Salmonella na E. coli.

**Kidokezo**
Acha vitunguu saumu vilivyopondwa vikae dakika 10 kabla ya kupika. Hii inaruhusu mmenyuko wa kimeng'enya unaounda Allicin kutokea kikamilifu.`,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MEDICINES  (description + sideEffects per language)
// ─────────────────────────────────────────────────────────────────────────────
type MedI18n = { description: L3; sideEffects: L3 };

export const medicineI18n: Record<string, MedI18n> = {
  m1: {
    description: {
      rw: "Panadol Extra ni imiti yo gutuza ababarane irimo paracetamol na kafeyin. Ikoreshwa ku migabo, migareni, ububabare bw'umugongo, amenyo, n'ibihe by'akazi.",
      fr: "Panadol Extra est un analgésique combiné contenant du paracétamol et de la caféine. Utilisé contre maux de tête, migraines, douleurs dorsales, dentaires et menstruelles.",
      sw: "Panadol Extra ni dawa ya mchanganyiko ya kupunguza maumivu ikiwa na paracetamol na kafeini. Inatumika kwa maumivu ya kichwa, migraine, maumivu ya mgongo, meno, na hedhi.",
    },
    sideEffects: {
      rw: "Bikeya: isesemi, indwara y'uruhu. Hagarika niba inzitane irimo.",
      fr: "Rares : nausées, éruption cutanée. Cesser l'utilisation si une réaction allergique survient.",
      sw: "Nadra: kichefuchefu, upele. Acha kutumia ikiwa mzio unatokea.",
    },
  },
  m2: {
    description: {
      rw: "Antibiyotike ikora hose ikoreshwa mu kuvura indwara z'indirimbo harimo inzira z'uguhumeka, inzira z'indirimbo z'urwara, n'indwara z'uruhu.",
      fr: "Antibiotique à large spectre utilisé pour traiter les infections bactériennes des voies respiratoires, urinaires et cutanées.",
      sw: "Antibiotiki ya wigo mpana inayotumiwa kutibu maambukizo ya bakteria ya njia za kupumua, mkojo, na ngozi.",
    },
    sideEffects: {
      rw: "Imvururu y'inda, isesemi, indwara y'uruhu. Baza umuganga niba inzitane zikomeye zirimo.",
      fr: "Diarrhée, nausées, éruption cutanée. Consultez un médecin en cas de réactions graves.",
      sw: "Kuhara, kichefuchefu, upele. Tafuta msaada wa daktari kwa athari kali.",
    },
  },
  m3: {
    description: {
      rw: "Vitamini C kongeye igihamya, inkunga y'ibibumbano bya collagen, kandi ikora nk'imiti itera. Ikinini kidashe gishiramo amazi.",
      fr: "Supplément de Vitamine C pour renforcer l'immunité, soutenir la synthèse du collagène et agir comme antioxydant. Comprimé effervescent à dissoudre dans l'eau.",
      sw: "Kirutubisho cha Vitamini C kwa kuimarisha kinga, kusaidia usanisi wa collagen, na kutenda kama antioxidant. Kibonge kinachoyeyuka kwenye maji.",
    },
    sideEffects: {
      rw: "Ubuso bukeye mu nda. Gumya mu kigero cyagenwe.",
      fr: "Des doses élevées peuvent causer des troubles digestifs. Restez dans la dose recommandée.",
      sw: "Dozi nyingi zinaweza kusababisha usumbufu wa utumbo. Kaa ndani ya dozi inayopendekezwa.",
    },
  },
  m4: {
    description: {
      rw: "Imiti ya mbere ikoreshwa mu kuvura diyabete ya Ubwoko bwa 2. Igabanya isukari mu maraso mu kugabanya ibikorwa bya glucose mu mibago no kunoza ubushobozi bwa insuline.",
      fr: "Traitement de première intention du diabète de type 2. Réduit la glycémie en diminuant la production de glucose dans le foie et en améliorant la sensibilité à l'insuline.",
      sw: "Matibabu ya mstari wa kwanza wa kisukari cha aina ya 2. Hupunguza sukari ya damu kwa kupunguza uzalishaji wa glukosi kwenye ini na kuboresha unyeti wa insulini.",
    },
    sideEffects: {
      rw: "Isesemi, imvururu y'inda, ububabare bw'inda — ibisanzwe birangira nyuma y'igihe.",
      fr: "Nausées, diarrhées, douleurs abdominales — s'améliorent généralement avec le temps.",
      sw: "Kichefuchefu, kuhara, maumivu ya tumbo — kawaida yanaboresha baada ya muda.",
    },
  },
  m5: {
    description: {
      rw: "Imiti y'ibibazo by'imibonano (NSAID) y'ububabare, ubutuzo bw'imitsi, n'urura. Ikorera neza mu bumenyi bw'amenyo, hari-rite, n'ibikomere byo gukina.",
      fr: "Anti-inflammatoire non stéroïdien (AINS) pour douleur, inflammation et fièvre. Efficace contre douleurs dentaires, arthrite et blessures sportives.",
      sw: "Dawa ya kupinga uvimbe isiyo ya steroidi (NSAID) kwa maumivu, uvimbe, na homa. Inafaa kwa maumivu ya meno, arthriti, na majeraha ya michezo.",
    },
    sideEffects: {
      rw: "Ibibazo by'inda, isesemi. Ntishimwa ku batwita cyangwa bavuranira indirimbo z'umutima cyangwa impyisi.",
      fr: "Maux d'estomac, nausées. Non recommandé en cas de problèmes rénaux ou cardiaques.",
      sw: "Usumbufu wa tumbo, kichefuchefu. Haipendekezwi kwa matatizo ya figo au moyo.",
    },
  },
  m6: {
    description: {
      rw: "Imiti isabwa na WHO yo kuvura impiswi y'amazi bitewe n'imvururu y'inda n'isesemi. Isubiza vite gutuza kw'imiti y'ibirakuri.",
      fr: "Traitement recommandé par l'OMS contre la déshydratation due aux diarrhées et vomissements. Rétablit rapidement l'équilibre électrolytique.",
      sw: "Matibabu yanayopendekezwa na WHO kwa upungufu wa maji unaosababishwa na kuhara na kutapika. Hurejesha haraka usawa wa elektroliti.",
    },
    sideEffects: {
      rw: "Banzwe cyane. Ongera na sukari ntamaze.",
      fr: "Généralement très sûr. Ne pas ajouter de sucre supplémentaire.",
      sw: "Kawaida salama sana. Usiongeze sukari ya ziada.",
    },
  },
  m7: {
    description: {
      rw: "Imiti yo gukumira malariya ikoreshwa mu gukumira no kuvura malariya yatewe na P. vivax, P. malariae, n'P. falciparum ifitiwe umuti.",
      fr: "Médicament antipaludique utilisé pour la prévention et le traitement du paludisme causé par P. vivax, P. malariae et P. falciparum sensible.",
      sw: "Dawa ya kutibu malaria inayotumiwa kuzuia na kutibu malaria inayosababishwa na P. vivax, P. malariae, na P. falciparum inayojibu dawa.",
    },
    sideEffects: {
      rw: "Isesemi, inzitira, ibibazo byo kureba igihe kirekire gikoreshwa.",
      fr: "Nausées, maux de tête, troubles visuels avec une utilisation prolongée.",
      sw: "Kichefuchefu, maumivu ya kichwa, matatizo ya kuona na matumizi ya muda mrefu.",
    },
  },
  m8: {
    description: {
      rw: "Imiti ikumira ibibazo by'inkorora idateza utungu kugira induru y'imisesagiro, urhume, n'urura bw'ishyamba. Ikora vite kandi ikurikirana amasaa 24.",
      fr: "Antihistaminique non sédatif pour rhinite allergique, urticaire et rhume des foins. Action rapide et couverture 24 heures.",
      sw: "Antihistamine isiyosababisha usingizi kwa rhinitis ya mzio, urticaria, na homa ya nyasi. Inafanya haraka na kinga ya masaa 24.",
    },
    sideEffects: {
      rw: "Bworoshye: inzitira, akamero gasutse. Muri rusange bihanwa neza.",
      fr: "Légers : maux de tête, bouche sèche. Généralement bien toléré.",
      sw: "Kidogo: maumivu ya kichwa, kinywa kikavu. Kwa ujumla inavumilika vizuri.",
    },
  },
  m9: {
    description: {
      rw: "Isakoshe ryuzuye ryo gukira ibicurane n'inkorora. Irimo paracetamol, Vitamini C, na imiti igabanya ibumba. Ikemura inzitira, izuri irwara, umuhogo ushaje, n'ibibazo bw'umubiri.",
      fr: "Sachet tout-en-un pour soulager rhume et grippe. Contient paracétamol, Vitamine C et décongestionnant. Soulage maux de tête, nez bouché, gorge irritée et douleurs corporelles.",
      sw: "Begi kamili la kupunguza dalili za mafua na homa. Lina paracetamol, Vitamini C, na dawa ya kufungua pua. Inasaidia maumivu ya kichwa, pua iliyofungwa, koo iliyoumia, na maumivu ya mwili.",
    },
    sideEffects: {
      rw: "Bishobora guteza utungu. Irinda gutwara imodoka igihe unywa imiti y'ibumba.",
      fr: "Possible somnolence. Évitez de conduire si vous prenez le décongestionnant.",
      sw: "Inawezekana usingizi. Epuka kuendesha gari ukitumia dawa ya kufungua pua.",
    },
  },
  m10: {
    description: {
      rw: "Antibiyotike ikora hose mu kigero cya 250mg. Ikoreshwa mu kuvura indwara nke cyangwa hagati ya inzira z'uguhumeka n'amatwi z'indirimbo. Bisaba uruhushya rw'umuganga.",
      fr: "Antibiotique à large spectre en dose 250mg. Utilisé pour les infections bactériennes légères à modérées des voies respiratoires et oreilles. Nécessite une ordonnance valide.",
      sw: "Antibiotiki ya wigo mpana katika dozi ya 250mg. Inatumika kwa maambukizo ya wastani ya bakteria ya njia za kupumua na masikio. Inahitaji cheti halali cha daktari.",
    },
    sideEffects: {
      rw: "Imvururu y'inda, isesemi, indwara y'uruhu. Baza umuganga niba inzitane zikomeye zirimo.",
      fr: "Diarrhée, nausées, éruption cutanée. Consultez un médecin en cas de réactions graves.",
      sw: "Kuhara, kichefuchefu, upele. Tafuta msaada wa daktari kwa athari kali.",
    },
  },
  m11: {
    description: {
      rw: "Gel nziza kuvura indwara y'izuba, ibicucu by'uruhu, no kunywa iminsi yose. Ifasha n'irakiza uruhu rworoshye ku buryo kamere utoginga imyobo.",
      fr: "Gel apaisant pur pour coups de soleil, irritations cutanées et hydratation quotidienne. Hydrate et apaise naturellement la peau sensible sans obstruer les pores.",
      sw: "Jeli ya kutuliza kwa kuchomwa na jua, muwasho wa ngozi, na unyevu wa kila siku. Inanyweka na kutuliza ngozi nyeti kwa asili bila kuziba vinyweleo.",
    },
    sideEffects: {
      rw: "Bikeya cyane: ibicucu bworoshye by'uruhu. Subiramo ku gice gato ku bantu banorweho neza.",
      fr: "Rares : légère irritation cutanée. Test cutané recommandé pour les peaux sensibles.",
      sw: "Nadra sana: muwasho mdogo wa ngozi. Jaribio la ngozi linapendekezwa kwa ngozi nyeti.",
    },
  },
  m12: {
    description: {
      rw: "Imiti ikumira ingaruka z'izuba UVA/UVB. Imiterere yoroheje idatera ibumba ikwiye kukoreshwa buri munsi ku maso no ku mubiri. Irinda amazi iminota 80.",
      fr: "Protection solaire à large spectre UVA/UVB. Formule légère non grasse adaptée à un usage quotidien sur le visage et le corps. Résistante à l'eau 80 minutes.",
      sw: "Mfumo wa kinga ya jua wa wigo mpana wa UVA/UVB. Fomula nyepesi isiyo ya mafuta inayofaa kwa matumizi ya kila siku usoni na mwilini. Inapinga maji kwa dakika 80.",
    },
    sideEffects: {
      rw: "Bikeya: indwara y'uruhu. Irinda gukora mu maso.",
      fr: "Rares : éruption cutanée. Éviter le contact avec les yeux.",
      sw: "Nadra: upele wa ngozi. Epuka kuwasiliana na macho.",
    },
  },
  m13: {
    description: {
      rw: "Imiti isukura ibiganza itsindagiye imiti ya WHO irimo 70% ya alkol. Ica 99.9% y'udukoko n'indirimbo vuba. Ntayizi n'isabuni bisabwa.",
      fr: "Désinfectant pour les mains formulé selon l'OMS avec 70% d'alcool isopropylique. Tue 99,9% des germes et bactéries instantanément. Sans eau ni savon.",
      sw: "Kisafishaji cha mikono kilichotengenezwa kwa fomula ya WHO chenye isopropyl alkoholi 70%. Inamuwa 99.9% ya vijidudu na bakteria papo hapo. Hakuna maji wala sabuni inayohitajika.",
    },
    sideEffects: {
      rw: "Bishobora guteza uruhu guumara igihe bikoreshwa cyane. Bishobora guturika — irinda umuriro.",
      fr: "Peut provoquer une sécheresse cutanée avec une utilisation excessive. Inflammable — tenir à l'écart du feu.",
      sw: "Inaweza kusababisha ukavu wa ngozi na matumizi mengi. Inawaka moto — kaa mbali na moto.",
    },
  },
  m14: {
    description: {
      rw: "Imodeli y'imyenda y'indwi irinda indirimbo y'umwuka, iri mu cyiciro cy'amabati 3. Iziguye birabigirira kandi biterwa n'amacakure y'amatwi n'inzira y'izuru kubikora neza.",
      fr: "Masques chirurgicaux jetables 3 couches offrant un filtrage efficace des particules en suspension. Élastiques confortables et clip nasal pour une fixation sécurisée.",
      sw: "Barakoa za upasuaji zinazoweza kutupwa zenye safu 3 zinazotoa uchujaji mzuri wa chembe za hewa. Masikio ya starehe na klipu ya pua kwa ufungaji salama.",
    },
    sideEffects: {
      rw: "Nta ngaruka. Tangira mu buryo bwizewe nyuma yo gukoreshwa.",
      fr: "Aucun. Éliminer en toute sécurité après utilisation.",
      sw: "Hakuna. Tupa kwa usalama baada ya matumizi.",
    },
  },
  m15: {
    description: {
      rw: "Imiti y'ugukumira gutwita yarimo imiti ibiri ikoreshwa mu guteganya ibyaro. Irimo imiti y'imisigati kugira ngo itahe gutwita nk'ubwiza bwa 99% igihe ifashwe neza.",
      fr: "Contraceptif oral combiné pour la planification familiale. Contient des hormones synthétiques pour prévenir la grossesse avec plus de 99% d'efficacité si pris correctement.",
      sw: "Kidonge cha uzazi wa mpango cha pamoja kwa kupanga familia. Kina homoni za sanisi kuzuia ujauzito kwa zaidi ya 99% ya ufanisi ukitumiwa vizuri.",
    },
    sideEffects: {
      rw: "Isesemi, indwara zo guturika, impinduka z'imitekerereze. Baza umuganga niba ibimenyetso bikomeza.",
      fr: "Nausées, spotting, changements d'humeur. Consultez un médecin si les symptômes persistent.",
      sw: "Kichefuchefu, kutoka damu kidogo, mabadiliko ya hisia. Shauriana na daktari ikiwa dalili zinaendelea.",
    },
  },
  m16: {
    description: {
      rw: "Inkoni yoroheje y'inomeri igenda irimo inkoni y'inomeri itanyererana. Igenamiterere ry'uburebure ku bantu banyuranye. Ikwiye ku bakuze no gukira nyuma y'ubuvuzi.",
      fr: "Canne de marche en aluminium léger avec embout antidérapant en caoutchouc. Hauteur réglable pour différents utilisateurs. Idéal pour personnes âgées et récupération post-chirurgicale.",
      sw: "Fimbo ya kutembea nyepesi ya aluminium yenye ncha ya mpira isiyoteleza. Inaweza kurekebishwa kwa urefu tofauti wa watumiaji. Inafaa kwa wazee na kupona baada ya upasuaji.",
    },
    sideEffects: {
      rw: "Nta ngaruka. Genzura ingano nziza kugira ngo wirinde ibibazo byo guturika.",
      fr: "Aucun. Assurer un ajustement correct pour éviter les problèmes de posture.",
      sw: "Hakuna. Hakikisha ufuataji sahihi ili kuepuka matatizo ya mkao.",
    },
  },
  m17: {
    description: {
      rw: "Umusaya w'ibundo w'ibiruhe wo gukumira ububabare n'gutuza ingingo. Ukwiye ku hari-rite, ibikomere byo gukina, no gukira nyuma y'ubuvuzi.",
      fr: "Orthèse de compression élastique du genou pour soulagement de la douleur et stabilisation articulaire. Convient à l'arthrite, blessures sportives et récupération post-opératoire.",
      sw: "Bresi ya goti ya kubana kwa mshtuko kwa kupunguza maumivu na kuimarisha kiungo. Inafaa kwa arthriti, majeraha ya michezo, na kupona baada ya upasuaji.",
    },
    sideEffects: {
      rw: "Irinda gunyaga cyane kugira ngo wirinde ibibazo byo gutembera kw'amaraso.",
      fr: "Éviter de serrer trop fort pour prévenir les problèmes de circulation.",
      sw: "Epuka kuvaa kwa ukarimu sana ili kuzuia matatizo ya mzunguko wa damu.",
    },
  },
  m18: {
    description: {
      rw: "Inkukuruzo nziza kandi zinywa cyane z'abana. Kurinda inzarura n'ibintu byoroshye ku ruhu rworoshye. Zibonetse mu ingano S, M, n'L.",
      fr: "Couches bébé douces et absorbantes pour nourrissons. Protection anti-fuite avec matériaux hypoallergéniques pour peaux délicates. Disponibles en tailles S, M et L.",
      sw: "Nepi laini na zinazofyonza kwa watoto wachanga. Ulinzi dhidi ya kuvuja na nyenzo zisizo na mzio kwa ngozi nyeti. Zinapatikana kwa saizi S, M, na L.",
    },
    sideEffects: {
      rw: "Bikeya: indwara y'uruhu. Genzura impinduka muri igihe kandi mu gihe neza.",
      fr: "Rares : érythème fessier. Assurer des changes réguliers et rapides.",
      sw: "Nadra: upele wa nepi. Hakikisha mabadiliko ya kawaida na ya wakati.",
    },
  },
  m19: {
    description: {
      rw: "Inyongera igabanyije y'inda irimo acide folique, ibiryo biriho ibyuma, calcium, na DHA. Ngombwa cyane mu iterambere ry'umwana uri mu nda no gutuza ababyeyi mu gihe cy'inda.",
      fr: "Supplément prénatal complet avec acide folique, fer, calcium et DHA. Essentiel pour le bon développement fœtal et la nutrition maternelle pendant la grossesse.",
      sw: "Kirutubisho kamili cha kabla ya kujifungua chenye asidi ya folic, chuma, kalsiamu, na DHA. Muhimu kwa ukuaji mzuri wa fetasi na lishe ya uzazi wakati wa ujauzito.",
    },
    sideEffects: {
      rw: "Ishobora guteza isesemi cyangwa imfubutso. Fata hamwe n'ibiribwa kugira ngo ukumire ingaruka.",
      fr: "Peut causer nausées ou constipation. Prendre avec de la nourriture pour minimiser les effets secondaires.",
      sw: "Inaweza kusababisha kichefuchefu au kuvimbiwa. Chukua na chakula kupunguza madhara.",
    },
  },
  m20: {
    description: {
      rw: "Termometero y'ikoranabuhanga y'inzira zoroheje. Ikwiye gufata ubushyuhe mu kanwa, munsi y'ikona, cyangwa mu nzira y'inyuma. Imyumvire ibika uturuho two mu nyuma.",
      fr: "Thermomètre numérique à lecture rapide avec embout flexible. Convient pour mesure orale, axillaire ou rectale. Fonction mémoire pour la dernière lecture.",
      sw: "Kipimajoto cha dijiti chenye ncha inayobadilika. Inafaa kwa upimaji wa mdomo, kwapa, au njia ya haja kubwa. Kazi ya kumbukumbu huhifadhi usomaji wa mwisho.",
    },
    sideEffects: {
      rw: "Nta ngaruka. Sasura n'ubushuhe bw'alkol hagati y'ibikorwa.",
      fr: "Aucun. Nettoyer avec une lingette alcoolisée entre les utilisations.",
      sw: "Hakuna. Safisha na pedi ya alkoholi kati ya matumizi.",
    },
  },
  m21: {
    description: {
      rw: "Igikoresho cy'amaraso gikora ku mugongo kigira ibonye ry'LCD rinini. Ibimenyetso bya WHO, kumenya umutima udasanzwe, n'imyumvire y'amasomero 60.",
      fr: "Tensiomètre automatique pour le bras supérieur avec grand écran LCD. Indicateur de classification OMS, détection d'arythmie et mémoire pour 60 mesures.",
      sw: "Kipima shinikizo la damu cha kiotomatiki cha mkono wa juu chenye skrini kubwa ya LCD. Kiashiria cha uainishaji cha WHO, utambuzi wa mfumo wa moyo usio wa kawaida, na kumbukumbu ya usomaji 60.",
    },
    sideEffects: {
      rw: "Nta ngaruka. Ntukoreshe ku mkono wirimo inzira y'inzarura.",
      fr: "Aucun. Ne pas utiliser sur le bras portant une perfusion intraveineuse.",
      sw: "Hakuna. Usitumie mkono wenye mfumo wa IV.",
    },
  },
  m22: {
    description: {
      rw: "Ubwoko bwuzuye bw'imiti bwa vuba bw'ibice 50 birimo imirasire, imiti isukura, ibipapuro bya gauze, mikasi, ivirinzi bishoboka, n'amabwiriza y'imiti ya mbere.",
      fr: "Trousse de premiers secours complète de 50 pièces comprenant pansements, lingettes antiseptiques, gaze, ciseaux, gants jetables et manuel de premiers secours d'urgence.",
      sw: "Seti kamili ya msaada wa kwanza yenye vipande 50 ikiwemo bandeji, wipes za antiseptic, gauze, mkasi, glavu za kutupwa, na mwongozo wa dharura wa msaada wa kwanza.",
    },
    sideEffects: {
      rw: "Nta ngaruka. Genzura amatariki y'imiti isukura.",
      fr: "Aucun. Vérifier les dates d'expiration des contenus antiseptiques.",
      sw: "Hakuna. Angalia tarehe za kumalizika kwa vitu vya antiseptic.",
    },
  },
  m23: {
    description: {
      rw: "Imiti ikumira guturika kw'amaraso ikoreshwa kugabanya inzitane zo guturika k'umutima no kumanika k'amaraso. Isanzwe ihabwa kugira ngo irinde ibivute by'umutima igihe kirekire.",
      fr: "Agent antiplaquettaire utilisé pour réduire le risque de crise cardiaque et d'AVC. Anti-inflammatoire. Souvent prescrit pour la protection cardiovasculaire à long terme.",
      sw: "Wakala wa kupinga sahani za damu unaotumiwa kupunguza hatari ya mshtuko wa moyo na kiharusi. Kuzuia uvimbe. Mara nyingi huwekwa kwa ulinzi wa moyo na mishipa kwa muda mrefu.",
    },
    sideEffects: {
      rw: "Ibibazo by'inda, kongera inzitane z'inkombo. Irinda niba uriho inzitane y'imiti ya NSAID.",
      fr: "Irritation gastro-intestinale, risque accru de saignement. Éviter si allergie aux AINS.",
      sw: "Mwasho wa utumbo, hatari iliyoongezeka ya kutoka damu. Epuka ikiwa una mzio kwa NSAIDs.",
    },
  },
  m24: {
    description: {
      rw: "Amavuta y'inzovu y'omega-3 y'ingero nziza agaragaza EPA na DHA. Inkunga ubuzima bw'umutima, imirimo y'ubwonko, kandi igabanya ubutuzo bw'imitsi. Fomula y'inzira y'ibumbu.",
      fr: "Huile de poisson oméga-3 haute puissance fournissant EPA et DHA. Soutient la santé cardiaque, la fonction cérébrale et réduit l'inflammation. Formule sans renvoi.",
      sw: "Mafuta ya samaki ya omega-3 yenye nguvu nyingi yanayotoa EPA na DHA. Yanasaidia afya ya moyo, kazi ya ubongo, na kupunguza uvimbe. Fomula bila kurudi kwa ladha.",
    },
    sideEffects: {
      rw: "Kamere y'inzovu, ibibazo bworoshye by'inda mu mfungo menshi. Bika mu ahantu hashyushye.",
      fr: "Goût de poisson résiduel, légers troubles digestifs à doses élevées. Conserver au frais et au sec.",
      sw: "Ladha ya samaki inayobaki, usumbufu mdogo wa utumbo kwa dozi nyingi. Hifadhi mahali pa baridi pakavu.",
    },
  },
  m25: {
    description: {
      rw: "Inyongera ya whey protein yo gukira imitsina, gusimbuka ifunguro, n'inkunga y'intungamubiri. Protein imwe na 24g buri dose hamwe n'isukari nke.",
      fr: "Supplément de protéines de lactosérum pour récupération musculaire, substitut de repas et soutien nutritionnel. 24g de protéines par portion avec faible teneur en sucre.",
      sw: "Kirutubisho cha protini ya whey kwa kupona misuli, mbadala wa mlo, na msaada wa lishe. Protini 24g kwa kila sehemu na maudhui ya chini ya sukari.",
    },
    sideEffects: {
      rw: "Ibumba ku bantu bafite ibibazo by'amavuta. Koresha amavuta adafite amavuta niba bisabwa.",
      fr: "Ballonnements chez les personnes intolérantes au lactose. Utiliser du lait sans lactose si nécessaire.",
      sw: "Uvimbe kwa watu wasiovumilia lactose. Tumia maziwa yasiyokuwa na lactose ikiwa inahitajika.",
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Pure localization helpers  (call useLanguageStore once in the component,
// then pass lang here — safe inside .map())
// ─────────────────────────────────────────────────────────────────────────────
import type { AppNotification, HealthArticle, Medicine } from "@/types";

function pick(map: L3 | undefined, lang: LangCode): string | undefined {
  if (!map || lang === "en") return undefined;
  return map[lang as keyof L3] ?? undefined;
}

export function localizeNotification(
  n: AppNotification,
  lang: LangCode
): AppNotification {
  const i = notifI18n[n.id];
  if (!i || lang === "en") return n;
  return {
    ...n,
    title: pick(i.title, lang) ?? n.title,
    message: pick(i.message, lang) ?? n.message,
  };
}

export function localizeArticle(
  a: HealthArticle,
  lang: LangCode
): HealthArticle {
  const i = articleI18n[a.id];
  if (!i || lang === "en") return a;
  return {
    ...a,
    title: pick(i.title, lang) ?? a.title,
    subtitle: pick(i.subtitle, lang) ?? a.subtitle,
    summary: pick(i.summary, lang) ?? a.summary,
    fullContent: pick(i.fullContent, lang) ?? a.fullContent,
  };
}

export function localizeMedicine(m: Medicine, lang: LangCode): Medicine {
  const i = medicineI18n[m.id];
  if (!i || lang === "en") return m;
  return {
    ...m,
    description: pick(i.description, lang) ?? m.description,
    sideEffects: pick(i.sideEffects, lang) ?? m.sideEffects,
  };
}
