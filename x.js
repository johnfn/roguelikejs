//Typekit.load();
//

document.write("<style type='text/css'>html{background:#090909;color:#ccc;} #l{width:900px;margin:0 auto;}#s{width:190px;margin-left:10px;float:right} #s span{font-size:.8125em;color:#666;text-transform:uppercase;} .L2{width:700px;float:left;height:500px;position:relative} #board{ width:500px;position:absolute;top:100px;left:100px;background:rgba(0,0,0,.85);padding:1em;} h1{text-shadow: #444 1px 1px 0px, #888 2px 2px 0px, #444 3px 3px 0px;font: 4em 'Helvetica Neue', sans-serif;letter-spacing: -5px;color:#c99} h1 #c{color:#ccc} canvas { position:absolute;top:0;left:0;visibility: hidden;} #status{clear:both;} </style>" + '<div id="l"><h1 class="head">mini<span id="c">Rogue</span></h1><div id="s"><div id="hlth"></div><br/><span style=color:red><b>Keys:</b></span><br/><div id="ks"></div></div><div class="L2"><canvas id="canvas0" width="700" height="500"></canvas><canvas id="canvas1" width="700" height="500"></canvas><div id="board"></div></div><div id="status"><br/><br/><br/><br/></div></div>');

$(function(){


    var keys=[],
        lastTicks=0,
        relText=[],
        boardUpdate=false,
        context,
        text=[],
        vis=[],
        colorsdict = [],
        waitTime=90,
        seen=[], 
        deadMode=false,
        pickupMode=false,
        magicMode= false,
        helpMode=1, //1-general. 2-magic. 3-range
        cBuffer = 0,
        actionkeys = [65, 87, 68, 88, 81,69,90,67,188, 190], sz = 16, map = [], REGENRATE=25, monsters = [], items = [], tr, inventory = [], showInventory = resting = false, moves = 0, statschange = false , 
        statpoints = 0,
        screenX = screenY = curlevel= 0, size, t=0, pc,B="<br/>",wielding={}, oldPosition, queue=[],usd={}, st="",rangeMode=false,whichTarget=0,showMap=true, shop, dungeonCache=[], wieldingBow = false;

    while (t++<=255) keys[t] = false;

    $(document).keydown (
        function(e){
            var ticks = (new Date()).getTime()
            //if (ticks - lastTicks < waitTime) return;
            //lastTicks = ticks;

            t = e.which;
            keys[t]=true;
            gameLoop();
        }
    )

    mrn = function(){return Math.random()}
    min = Math.min;
    max = Math.max;
    abs = Math.abs;
    function rnd(l, h){return l + ~~( mrn() * (h-l+1))}
    function rsp(l, h){return l + ~~( mrn() * h)}
    function intersect(a, b){ return a.x == b.x && a.y == b.y }
    function setxy(a, b){a.x = b.x;a.y = b.y}
    function dodmg(a,b) {
        b.follow=1;
        b.HP -= t=max(0,rnd(a.DMG, a.DMX+1)-b.DEF+(wieldingBow && a==Character ? a.DEX : a.STR)); 
        writeStatus(a.n + " hit" + (a.n[0]=="Y"?"":"s") +  " for " + t + " damage.");
        if (a.POI && rnd(0,10)==0) {effect("Poison"); writeStatus("You have been poisoned!")} 
        
        //TODO you should be able to poison as well.
        //Easy to implement; just give yourself the POI flag.

        if (b.HP < 0){ //FIXME and b is not Character
            writeStatus("Holy crap! "+(b.n=="You" ? "explode" : "explodes")+" in a huge explosion of blood! It's really gross!");
            Character.EXP += ~~Math.sqrt(b.maxHP*b.DMG/9)+1;
            if (rnd(0,5) <2) { items.push(new Item(b.x, b.y)); writeStatus("The monster dropped an item.")}
            for (i in monsters) if (monsters[i] == b) monsters.splice(i, 1);
        }
        return b.HP < 0; //Return true on death, false otherwise
    } //a hits b

    function relem(x){return x[rnd(0,x.length-1)]} 

    /*
     * end(w)
     *
     * Called after the death of a character. Dumps score to localstorage and writes out a high score table.
     *
     * Quite a feat in code condensing, if I may say so myself.
     */
    function end(w){
        tr=true, t=0,scr=[],l=localStorage;
        while (l["h"+t+"s"]) scr.push({"n":l["h"+t+"n"],"s":l["h"+t+"s"]}), t++; 
        scr.push({"n":"<b>"+(l["h"+t+"n"]=": You")+"</b>","s":l["h"+t+"s"]=curlevel*10+Character.EXP});
        scr.sort(function(a,b){return (b.s-0)-(a.s-0)});
        var list = [];
        for (var x=0;x<15;x++) list.push(scr[x].s +  scr[x].n);
        renderList("Highscores", list);
    }

    /*
     * generateLevel: Generates the lth level with appropriately positioned items and monsters.
     * d: 0 if you are going down, 1 if you are going up.
     *
     * Currently, I don't think that this function is correctly generating the MST. However, it doesn't
     * really matter; the user can't really tell.
     *
     */
    function generateLevel(l,d){ 
        //BEGIN METRICS :: TODO REMOVE FOR FINAL VERSION
        /*
        try {
            var mpmetrics = new MixpanelLib("8ef30ce80ba96d3f512f96de576f1b79");
        } catch(err) {
            null_fn = function () {};
            var mpmetrics = { track: null_fn, track_funnel: null_fn, register: null_fn, register_once: null_fn };
        }

        mpmetrics.track('Level', {
           'test' : 1,
           'Dlevel': l,
           'direction': d,
           'Character': Character
        });

        */
        //END METRICS

        if (l==0){
            for (i in inventory) if (inventory[i].ists) { writeStatus("Holy crap! YOU WIN!"); end(1); return;}
            writeStatus("A mysterious force returns you to the dungeon!"); curlevel=1; return;
        }

        var oldL = l;
        if (d==1) oldL++; else oldL--;
        var dc = dungeonCache[oldL];
        if (!dc){
            dc ={};
            dc.map = map;
            dc.items = items;
            dc.monsters = monsters;
            dc.shop = shop;
            dc.posx = Character.x;
            dc.posy = Character.y;
            dc.seen = seen;
            Character.MP=5;
        }
        dungeonCache[oldL] = dc;
        //Store the current (before you create this level) level in the dungeon cache
        dc = dungeonCache[l];
        if (dc){
            //Pull a previously created dungeon out of the cache, if it exists.
            map = dc.map;
            items = dc.items;
            monsters = dc.monsters;
            shop = dc.shop;
            Character.x = dc.posx;
            Character.y = dc.posy;
            seen = dc.seen;
            return;
        }

        var buff=8;
        curlevel=l;
        items=[], monsters=[];
        size = buff*2+25* rsp(2,l-1),roomn = size/10 //rsp(2*size/40, 6*size/40); //TODO make roomn non-random
        var numMonsters = ~~(roomn * 2.2);

        map=[];a=b=0;while(a++<size){map.push([]);while(b++<size)map[a-1].push("#");b=0}
        //map = rng(size).map(function(){return rng(size).map(fgen("#"))}); 
        var rooms=[],r, loops=0,cr;
        var t, q;
        nn = roomn = ~~(roomn);
        while(roomn--){
            (r={}).x=rnd(buff,size-buff-15);r.y=rnd(buff,size-buff-15);
            r.w=r.h=rnd(12,15);
            if (numMonsters>0){
                r.m = rnd(0,3);
                numMonsters -= r.m;
            }
            rooms.push(r);
        }
        var up=relem(rooms), dn = relem(rooms);
        start = [up,dn][d];

        for (ro in rooms){
            var wroom = Math.random() > .5;
            for (var x=(cr=rooms[ro]).x;x<cr.x+cr.w;++x){
                var v = rnd(7,15);
                for (var y=cr.y;y<cr.y+cr.h;++y){
                    rnd(0,999) < 4 ? items.push(new Item(x,y)):0;// :( q < 10 ? monsters.push(new Monster(x,y,l)) : 0); 
                    if (cr != start && (x+y)%7==0 && cr.m-->0){
                        monsters.push(new Monster(x,y,l));
                    }
                    map[x][y] = wroom?"~":".";
                }
            }
        }

        /*
         * TODO ensure that the number of placed monsters is at least numMonsters
        t=0;
        while(numMonsters>0){
            rooms[t] += 1; 
            t = t+1 % roomn;
        }
        */
        for (ro in rooms){
            rooms[ro].c=true;
            for (r2 in rooms){
                var b=0;
                if (!rooms[r2].c) {
                    if (!b || abs(rooms[r2].x-rooms[ro].x)+abs(rooms[r2].y-rooms[ro].y)<
                              abs(rooms[r2].x-rooms[b ].x)+abs(rooms[r2].y-rooms[b ].y)){
                       b=r2; 
                    }
                }
            }
            rooms[b].c=true;
            var a=rooms[b].x,b=rooms[b].y;
            while(a!=rooms[ro].x) map[a>rooms[ro].x?a--:a++][b]="."; 
            while(b!=rooms[ro].y) map[a][b>rooms[ro].y?b--:b++]="."; 
        }


        map[up.x+3][up.y+3] = ">";
        if (curlevel != 15){  //TODO dungeon length could be part of the difficulty modifier. Hmm, but then we would need more monster types hurgle.
            map[dn.x+4][dn.y+4] = "&lt;";
        } else {
            tnarg.x = dn.x+4;
            tnarg.y = dn.y+4;

            items.push(tnarg);
        }
        
        seen=[];a=b=0;
        while(a++<size){seen.push([]);while(b++<size)seen[a-1].push(false);b=0}

        //seen= rng(size).map(function(){return rng(size).map(fgen(false))}); 

        t=up;//relem(rooms); //TODO definitely not here :)

        /*
         * Unique items.
         *
         * If I'm running out of space (unlikely...) then TODO i can make this into a bar delimited string like normal.
         */
        var uniqueItems = [{name: "The Greatsword", typ:"w", cls:"[", spec: {"STR": 5, "DMG":10, "DMX":15}}]; 
        var uni = new Item(t.x+1, t.y+1, uniqueItems[0].cls, uniqueItems[0].spec, uniqueItems[0].name, uniqueItems[0].typ);


        //Create a unique monster on this level.
        //monsters.push(new Monster(t.x+2,t.y+2,l, true));

        t = [up,dn];
        Character.x = t[d].x+3+d;
        Character.y = t[d].y+3+d;


        oldPosition = {x : Character.x, y : Character.y } ; 
    }

    /*
     * writeks(d)
     *
     * Writes the keys that you can press to screen.
     */

    function writeks(d, l){
        var s="";
        for (k in d)
            s += " <b>"+k+"</b>:" + d[k]+ " |";
            //s += " "+k+":" + d[k]+ " |";

        //context.fillStyle = 'white'; //TODO
        //context.fillText(s,20,450+ (l||0));
        $("#ks").html(s+B);

    }
    /*
     * checkLevelUp()
     *
     * Levels up the character, if necessary.
     */
    function checkLevelUp(){
        if (Character.EXP > Character.NXT){
            Character.NXT *=2;
            Character.LVL++;
            writeStatus("<span style='color:red'>Level up! Hit L to adjust your new stats.</span>");
            statpoints++;
        }
    }

    /*
     * intersectItems()
     *
     * Checks to see if the character is walking over an item, and if so, reads off its name.
     *
     * In the special case of money, it auto-pickups.
     *
     */
    function intersectItems(){
        for (i in items){
            items[i].N(); //Ensure that it has the correct name.
            if (intersect(Character, items[i])){
                 t = items[i].cls;

                 if (items[i].cls == "$"){
                    items[i].use();
                    items.splice(i,1); //TODO: code duplication --sorta :: BAD (maybe have an "in inventory" flag?)
                    writeStatus("You have "+Character.money+"G.");
                    break;
                 } else {
                     if (t=="?" || t=="!") //TODO if I add rings necklaces etc, add them hear.
                         pickupItem(undefined, true); 
                     else 
                         writeStatus(items[i].n + " rolls under your feet.");
                 
                 }
            }
        }
    }

    /*
     * checkStatsChange()
     *
     * If the player has chosen to add to their stats, this function is called.
     */

    function checkStatsChange(){
        writegenericlist(0,0);
        writeks({"D":"exterity","S":"trength","I":"ntelligence"});
        t = {68:"DEX",83:"STR",73:"INT"};
        renderList("Gain a stat", ["(D)exterity (S)trength (I)ntelligence."]);
  
        for (x in t) if (keys[x]) {Character[t[x]]++; writeStatus(--statpoints + " points left.");}
        statschange = statpoints>0;
    }

    function enchantWeapon(lv){
        for (it in Inventory.items){ 
            t= Inventory.items[it];
            //TODO wtyp should just point to the item, so i don't have to search for it all the time...
            if (t.equipped && t.wtyp=="["){
                !t.spec["STR"] ? t.spec["STR"]=0:0;
                !t.spec["DEX"] ? t.spec["DEX"]=0:0;
                if ((t.spec["STR"] == lv-1 && !wieldingBow) || (t.spec["DEX"] && wieldingBow) ){
                    if (wieldingBow){
                        t.spec["DEX"] = lv;
                        Character.DEX++; 
                    } else { 
                        t.spec["STR"] = lv;
                        Character.STR++; //Now this is a beautiful hack. The c.str is removed when the item is not wielded, so it all works out...
                    }

                    writeStatus("The weapon glows light blue!");
                    return;
                } else {
                    if (t.spec["STR"] >= lv) { 
                        writeStatus("This weapon has already been enchanted to that level.");
                    } else {
                        writeStatus("This weapon has not been enchanted enough.");
                    }
                    
                    return true; //FAILURE
                }
            }
        }
        return true; //Couldn't find an equipped weapon, so failing instead.
    }

    /*
     * statusEffects()
     *
     * Deals with buffs from potions, as well as poison from monsters, and maybe even others.
     */

    function statusEffects(){
        st={};

        /*var ns = {t:15,rel:1,s:"STR",v:1,n:"+STR"};
        ns.n = t;*/
        for (V in queue){
            t=queue[V];
            st[t.n]?st[t.n]++:st[t.n]=1;
            if (t.t--<0){ //Status effect has run out of time?
                queue.splice(V, 1);
                if (t.rel) t.v*=-1; t.rel=0;
            }
            if (!t.rel) Character[t.s]+=t.v;
        }
    }

    //TODO If i implement a WIZARD CLASS, use this. Otherwise... meh
    // {n:"Magic dart", /*rng: 5,*/ effect:function(you, them){ dodmg(you, them); },cost:1  },


    //TODO BALANCE: Heal is pretty atrocious in later levels. Given that MP should scale... hur...
    //TODO: writeStatus on all of them.
    var spells = [ {n:"Wrath",    effect:function(you, them){ effect("strength"); writeStatus("You feel vengeful!"); }, intreq:2, cost:1 },
                   {n:"Heal",     effect:function(you, them){ you.HP = min(you.HP+ 5, you.maxHP); writeStatus("You feel better."); }       , intreq:2, cost:2 },
                   {n:"Teleport", effect:teleport                                  , intreq:3, cost:3 },
                   {n:"Reveal Monsters", effect:function(y,t){Character.revealm=-15-2; queue.push({t:15,rel:0,s:"revealm",v:1,n:"Reveal"}); writeStatus("You feel more perceptive. See the minimap.")} , intreq:4, cost:2 },
                   {n:"Reveal Items", effect:function(y,t){Character.reveali=-15-2; queue.push({t:15,rel:0,s:"reveali",v:1,n:"Reveal"});writeStatus("You sense the presence of objects. See the minimap.")} , intreq:2, cost:2 },
                   {n:"Enchant Weapon I", effect:function(y,t){enchantWeapon(1);} ,  intreq:4, cost:4 },
                   {n:"Enchant Weapon II", effect:function(y,t){enchantWeapon(2);} , intreq:6, cost:4 },
                   {n:"Enchant Weapon III", effect:function(y,t){enchantWeapon(3);} , intreq:8, cost:4 }
                 ];


    function magicAction(){
        writeks({"e":" List avaiable spells", "Enter":"Fire", "ESC" : " Cancel"});


        var list = [];
        for (t in spells) {
            //TODO make color gray.
            var s = (t-0+1) + ": " +spells[t].n+" ("+spells[t].cost + "MP) ";
            if (spells[t].intreq > Character.INT)s = "<span style='color:gray'>"+s+" - "+spells[t].intreq+" INT required</span>";
            list.push(s); //.css("color", spells[t].intreq > Character.INT ? "gray" : "black");
        }
        renderList("Spells", list);

        //49 == 1
        //50 == 2 
        //...

        /*
         * This snippet is for casting spells.
         */
        for (x in spells){
            if (keys[x-0+49]){
                if (Character.MP < spells[x].cost){
                    writeStatus("You don't have sufficient mana!");
                } else if (spells[x].intcost > Character.INT){
                    writeStatus("You need higher INT.");
                } else { 
                    //effect() returns true on FAILURE. returns nothing/undefined on success.
                    if (!spells[x].effect(Character, monsters[whichTarget])){ 
                        Character.MP -= spells[x].cost;
                        keys[x-0+49] = false;
                        
                        magicMode = false;
                        return true; //action has been taken
                    }
                }
            } 
        }

        if (keys[27]) {
            magicMode=false;
        } 
    }


    function rangeAction(){
        writeks({"S":" Cycle through monsters","Enter":"Fire", "ESC" : " Cancel"});
        /*
         * This snippet is to find the next available target.
         */
        if (keys[82]) {
            var di=1e6; //Infinity for all practical purposes

            var start = whichTarget;
            var found=false;
            //Find the next visible monster
            do { 
                whichTarget++;
                whichTarget %= monsters.length;

                var m = monsters[whichTarget];
                if (bounded(m.x-screenX) && bounded(m.y-screenY) && vis[m.x-screenX][m.y-screenY]) {
                    found = true;
                    break;
                }
            } while (whichTarget != start)
            
            if (!found){
                writeStatus("There are no monsters in range.");
                rangeMode=false;
                return;
            } else {
                boardUpdate = true;
            }
        }


        if (keys[27]) {
            rangeMode=false;
            whichTarget=0;
        } 

        /* 
         * This snippet is for ranged attack (with a bow)
         *
         * TODO: The arrows should drop to the ground when you attack, sometimes.
         */
        if (keys[13]){
            for (it in Inventory.items){ 
                t= Inventory.items[it];
                if (t.equipped && t.cls=="|" && t.count-->0){
                    if (dodmg(Character, monsters[whichTarget])){
                        whichTarget = 0;
                        rangeMode = false;
                    }
                    return true; //action has been taken
                }
            }
            writeStatus("You must wield arrows along with your bow.");

        }

        //writeBoard();

        return false;

    }
    function takeTurn(){
        pc=map[Character.x][Character.y]; 
        statusEffects(); 

        moves++;

        Character.HP += resting + (moves%REGENRATE==0 && Character.HP != Character.maxHP);
        if (pc == "#") {setxy(Character,oldPosition); writeStatus("You stupidly run into a rock.");} 
        for (i in monsters) monsters[i].update(oldPosition);
        
        intersectItems();
        if (pc == ">") writeStatus("You see stairs leading upward.");
        if (pc == "&lt;") writeStatus("You see stairs leading downward.");
        ssXY();
        if (resting){
            for (i in monsters)
                if (bounded(monsters[i].x-screenX) && bounded(monsters[i].y-screenY) && vis[monsters[i].x-screenX][monsters[i].y-screenY]) {
                    resting = false; writeStatus("A nearby monster wakes you!"); break;
                } 
        }
    }
    function renderSidebar(){
        var a="<span>", A="</span>";
        s="";for (x in st)s += x + " x " + st[x] + B;
        $("#hlth").html(
                a+"Level "+A + Character.LVL +" (" + Character.EXP + "/" + Character.NXT+")" +B+
                a+"Dungeon Level: "+A + curlevel +B + 
                a+"HP: "+A + Character.HP + "/" + Character.maxHP +B+
                a+"MP: "+A + Character.MP + "/5"+B+ 
                a+"Damage: "+A + (Character.DMG + (t=wieldingBow ? Character.DEX : Character.STR))+  "-" + (Character.DMX +t)+ B+  
                a+"Strength: "+A +Character.STR  +B+
                a+"Intelligence: "+A + Character.INT +B+ 
                a+"Dexterity: "+A + Character.DEX +B+ 
                a+"Armor: "+A + Character.DEF +B+ 
                a+"$: "+A + Character.money +B+ 
                s);
    }
    /*
     * minimap()
     *
     * Renders a minimap to screen. Awesome.
     *
     * Unfortunately, this function is very slow, even in Chrome. 
     *
     */
    function minimap(){
        var W = 20; //TODO Abstract
        for (var i=max(Character.y-20,0);i<min(Character.y+20, size);i++){
            for (var j=max(Character.x-20,0);j<min(Character.x+20, size);j++){
                writeTileGeneric(j-screenX+220, i-screenY+300, 2, map[j][i], seen[j][i], true, true);
            }
        }

        for (i in monsters){
            if (Character.revealm){
                writeTileGeneric(monsters[i].x-screenX+220, monsters[i].y-screenY+300, 2, "j", true, true);
            }
        }

        for (i in items){
            if (Character.reveali){
                try { 
                writeTileGeneric(items[i].x-screenX+220, items[i].y-screenY+300, 2, "?", true, true);
                } catch(e) {
                    debugger;
                }
            }
        }
        wTile(7*W+Character.x - screenX,6*W+ Character.y - screenY, "ff", "ff", "ff", 2);

        if (keys[27]){
            showMap = false;
        }
    }

    /*
     * doMultiPickup()
     */
    function doMultiPickup(){
        if (keys[65]){
            while(pickupItem(0));
            pickupMode=false;
        } else {
            for (var x=0;x<10;x++){
                if (keys[x+48]){
                    pickupItem(x);
                    pickupMode=false;
                    return;
                }
            }
        }

    }
    function renderList(title, contents){
        $("#board > span").html("").css({"background-color":"","color":""});
        $("#board").show();
        /*
        context.fillStyle = "#FFFFFF"
        context.fillRect(50,50,300,contents.length * 40);
        */
        for (x in contents){
            $("#"+x+"F0").html(contents[x]);
        }
    }
    /*
     * gameLoop()
     *
     * Takes care of most of the game logic, including odds and ends that it wasn't worth to decompose into functions.
     *
     */
    function gameLoop(){
        if (tr) { $("#c").html("Highscore"); return; }
        oldPosition = {x : Character.x, y : Character.y } ; 
        var action = false;

        Character.maxHP = 3 + Character.STR*4 + 12*Character.LVL; 

         for (i in inventory) inventory[i].N() 

         Character.HP=min(Character.HP,Character.maxHP);
         renderSidebar();


        //Different game states to run through. Game states are basically just states where keypresses do different things.
        if (deadMode) { 
            if (keys[89]){
                writeStatus("A mysterious force returns you to life!");
                Character.HP = ~~(Character.maxHP / 2);
                curlevel--;
                generateLevel(++curlevel, 0);
                writeBoard();
                deadMode = false;
            }
            if (keys[78]){
                end(0);
                deadMode = false;
            }

        //helpMode=1, //1-general. 2-magic. 3-range
        }else if (helpMode){
            if (keys[27]) helpMode=0;
            if (keys[77]) helpMode = 2;
            if (keys[82]) helpMode = 3;
            if (helpMode==1){
                renderList("Help", 
                        ["Welcome to miniRogue!",
                        "",
                        "This is the help screen.",
                        "",
                        "Press H to see this screen. Press ESC now to hide it.",
                        "",
                        "You are in search of the mysterious Talisman of Tnarg, an artifact of much power. It is said to reside deep within this dungeon (15 levels deep, that is). Once you acquire it, you must return to the surface, alive!",
                        "",
                        "Press 'S' at any time out of combat to sleep, and heal yourself.",
                        "",
                        "<b>For more help, press M to learn about magic, or R to learn about range combat.</b>"
                        ]);

            }
            if (helpMode==2){
                renderList("Magic",
                        ["Casting spells requires MP. You have a permanent MP cap at 5, and MP <i>does not regenerate</i>, except when you go down to a new level.",
                        "",
                        "Most magic spells also have an INT requirement. If you do not meet that requirement, you will be unable to cast that spell.",
                        "",
                        "To see spells, press 'm'. To cast a spell, press 'm', and then the spell number.",
                        "",
                        "Press R to learn about range combat."
                        ]);
            }
            if (helpMode==3){
                renderList("Range", 
                        ["To go into ranged combat, first wield both a bow and arrows.",
                        "",
                        "Then, when there is a nearby monster, press 'r'. Continue pressing 'r' to cycle through monsters.",
                        "",
                        "To fire, press ENTER. To return to normal mode, press ESC.",
                        "",
                        "Press M to learn about range combat."
                        ]);
            }
            
        }else if (statschange) {
            checkStatsChange(); 
        }else if (showInventory){
            //top: 100px; left:300px; width:300px; height:400px;
            writeks({"WX":" Move", "Enter":" Use","ESC":" close Inventory","D":"rop"});
            $("#c").html("Inventory");
            Inventory.getKeys();
            Inventory.display();
            if (!showInventory) ssXY();
        }else if (pickupMode){
            doMultiPickup();
        }else {

            if (!magicMode) $("#board").hide(); //$("#board > span").html("").css({"background-color":"","color":""}); //TODO abstract to list thingarydgy

            checkLevelUp();
            if (keys[82] && !rangeMode) {
                if (wieldingBow){ 
                    for (it in Inventory.items){ 
                        t= Inventory.items[it];
                        if (t.equipped && t.cls=="|" && t.count-->0){
                            rangeMode=true;
                            rangeAction();
                        }
                    }
                    if (!rangeMode) writeStatus("You must wield arrows along with your bow.");
                } else {
                    writeStatus("You must wield a bow before you attack from a distance.");
                }
            }

            if (keys[77]) magicMode = true;

            if (Character.HP<0) {
                writeStatus("You have died. :("); 
                writeStatus("Would you like to continue? (Y)es (N)o");
                Character.deaths++;
                deadMode = true;
            } //TODO would you like to continue anyway? mk.

            $("#c").html("Rogue");

            action = (rangeMode && rangeAction()) || (magicMode && magicAction()) || (!magicMode && !rangeMode && getKeys());

            if ( !tr && (action || resting)) {

                boardUpdate = true;
            }


            if (action || resting) { 
                resting = !(action || Character.HP == Character.maxHP) 
                takeTurn();
            }


            writeks({"QWE AD ZXC":" Move", "S":"leep (heal)","I":"nventory","G":"rab item", "Walk into a monster":"Attack",
                    "<br>>":" Go upstairs","<":" Go downstairs", "R":"ange","M":"ap" }, 30);
            //context.fillStyle = 'white';
            //context.fillText("miniRogue",50,50);
        }
        if (keys[27]) boardUpdate = true;  //27 is the ultimate "change stuff" key, anyway
        t=255;
        while(t--) keys[t]=false;

    }

    /*
     * writeStatus: Adds a new status to the list and pops the old one.
     *
     */
    function writeStatus(status){
        //bold top status
        if (!resting) {
            var ar = $("#status").html().split(">");
            ar.push(status+B); 
            ar.shift();
            $("#status").html( ar.join(">") );
        }
    }

    function updateIfNecessary(){
       if (boardUpdate){ 
            writeBoard(); 
            //if (Character.revealm || Character.reveali)
                minimap();
       }
        boardUpdate=false;
    }
    
    function initialize(){

        initColors(true);
        initColors(false);

        context = canv[cBuffer].getContext('2d');
        context.clearRect(0,0,500,500);

        Inventory = new Inven();
        Inventory.addItem(new Item(0,0,"("));
        Inventory.addItem(new Item(0,0,"|"));


        generateLevel(1,0);
        ssXY();

        //TODO eventually get rid of this... it is left over from a poorer time
        for (var i=0;i<sz;i++) { 
          for (var j=0;j<sz;j++) 
            $("#board").append("<span id='"+i+"F"+j+"'></span>"); 
        $("#board").append("<br>");
        } 
        setInterval(gameLoop,90);
        writeStatus("Some jerk buried the Amulet of Tnarg in this dungeon. It is your mission to get it!");

        //Get an estimate on how long writeBoard takes.
        
        // TODO: See if I even need this nemoar.
        var lTicks = (new Date()).getTime()
        for (var i=0;i<10;i++)
            writeBoard();
        var time = ((new Date()).getTime() - lTicks)/10; 

        setInterval(updateIfNecessary, lTicks+10);
        writeBoard();
        //function(forcecls, forcespec)

    }
    function bounded(x){
        return x>=0 && x<sz;
    }

    var canv= [document.getElementById("canvas0"), document.getElementById("canvas1")];
    
    /*function wTile(x,y,r,g,b,sz){ //Xpos, Ypos, (RGB), size
        context.fillStyle = '#' + r + g + b; //(r?d:"55") + (g?d:"55") + (b?d:"55");
        //var W=20;
        context.fillRect(x*sz,y*sz,sz,sz);
        /* experimental "speckling" of tiles.
         *
         * for (var i=0;i<10;i++){
            var P=40+~~(Math.random()*50);
            var v = '#' + (r?d:P) + (g?d:P) + (b?d:P);
            context.fillStyle = v;
            context.fillRect(x+Math.random()*(W-3),y+Math.random()*(W-3),3,3);
        }*//*
    } */
    function wTile(x, y, r, g, b, sz, h, txt){ 
        
        var tilesWide = 16;
        var tilesHigh = 16;

        var tWidth = sz;
        var tHeight = sz-9;
        var c = context;

        c.beginPath();
        var sx = tilesWide*sz+tWidth*x-tWidth*y, sy = tHeight*x+tHeight*y+50;
        c.moveTo(sx,sy-h);     
        c.lineTo(sx+tWidth,sy-h+tHeight);     
        c.lineTo(sx+tWidth,sy+tHeight);
        c.lineTo(sx+0 ,sy+tHeight*2);
        c.lineTo(sx-tWidth,sy+tHeight);
        c.lineTo(sx-tWidth,sy-h+tHeight);     
        c.lineTo(sx,sy-h);     

        c.fillStyle ="#222222";// ~~(Math.random()*999999);//"#555555";
        c.fill();
        c.closePath();

        c.beginPath();
        c.moveTo(sx,sy-h);     
        c.lineTo(sx+sz,sy-h+tHeight);     
        c.lineTo(sx+0 ,sy-h+tHeight*2);
        c.lineTo(sx-sz,sy-h+tHeight);    

        c.fillStyle = "#"+r+g+b;
        // Fill the path
        c.fill();
        c.closePath();

        if (txt) { 
            c.font = "15px arial";
            c.fillStyle = 'white';
            c.fillText(txt,sx,sy);
        }
        /* experimental "speckling" of tiles.
         *
         * for (var i=0;i<10;i++){
            var P=40+~~(Math.random()*50);
            var v = '#' + (r?d:P) + (g?d:P) + (b?d:P);
            context.fillStyle = v;
            context.fillRect(x+Math.random()*(W-3),y+Math.random()*(W-3),3,3);
        } */
    }
    function wTileMini(x,y,r,g,b,sz){ //Xpos, Ypos, (RGB), size
        context.fillStyle = '#' + r + g + b; //(r?d:"55") + (g?d:"55") + (b?d:"55");
        context.fillRect(x*sz,y*sz,sz,sz);
    }

    function isNumber(n) {
        return !isNaN(n-0); //!isNaN(parseFloat(n)) && isFinite(n);
    }

    function initColors(vis){
       colorsdict[vis] ={  "." : ["55", vis?"ff":"bb", "55"],
                           "~" : ["55", "55", vis?"ff":"bb", 3],
                           "#" : ["66", "66", "66", 18],
                      "&nbsp;" : ["11", "11", "11"],
                           "M" : ["ff", "55", "55", 8],  //TODO: in the future, could just scan monster color straight off monster object.
                           "U" : ["ff", "55", "ff", 8],
                           ">" : ["66", "66", "33", 18],
                        "&lt;" : ["44", "44", "22", 1], //TODO Make up/down the right keys =) or v^
                           "*" : ["66", "dd", "33", 25],
                           "I" : ["dd", "dd", "55", 6]
        };
    }
    function writeTileGeneric(i, j, sz, type, vis, mini){
        vis = vis ? true : false;
        f = mini ? wTileMini : wTile;
        if ("crgjsS".indexOf(type) != -1) type = "M";
        if ("!?[$(|".indexOf(type) != -1) type = "I";

        if (type=="@" || isNumber(type)) { 
            t = (~~(Character.HP*16/Character.maxHP)).toString(16);
            if (t=="10") t = "f";
            t=t+t;
            var ctx = (Character.HP != Character.oldHP ? Character.HP : "");
            var clv = (Character.LVL != Character.oldLV * 5) ? "Level up! (Press L)" : "";
            Character.oldHP = Character.HP
            if (Character.oldLV != Character.LVL * 5){
                Character.oldLV++;
                ctx = clv;
            }
            f(j,i,t,t,t,sz, 8, ctx+"");
        } else { 
            f(j, i, colorsdict[vis][type][0], colorsdict[vis][type][1], colorsdict[vis][type][2], sz, colorsdict[vis][type][3] || 5, (vis && !mini ? relText[i][j] : ""));
        }
        if (rangeMode && monsters[whichTarget].x - screenX == i && monsters[whichTarget].y-screenY == j)
            f(j, i, "33", "33", "33", sz, 8, relText[i][j]);

        if (mini && !vis)
            f(j,i,"00","00","00",sz);
    }

    function writeBoard(){

        text = [];
        vis = [];

        vis=[];a=b=0;while(a++<sz){vis.push([]);while(b++<sz)vis[a-1].push(0);b=0}

        //vis = rng(size).map(function() {return rng(size).map(fgen(0))}); 

        for (var i=0;i<sz;i++) { 
            text.push([]); 
            for (var j=0;j<sz;j++) text[i].push(map[i+screenX][j+screenY]);
        }  

        relText=[];a=b=0;while(a++<size){relText.push([]);while(b++<size)relText[a-1].push("");b=0}

        //TODO abstract out bounded into a function on the object.. or do one better and dont put it on the object...
        //
        //TODO There are a lot of optimizations to be made here. Also, could extract this into a loop through itemmonsters and save even more, if necessary.
        for (i in items) {
            var tx = items[i].x - screenX, ty = items[i].y - screenY;
            if(bounded(tx) && bounded(ty)) {
                text[tx][ty] = items[i].cls;
                items[i].N();
                relText[tx][ty] = (relText[tx][ty] == "") ?items[i].n : "Many items.";
            }
        }

        for (i in monsters) 
            if(bounded(monsters[i].x - screenX) && bounded(monsters[i].y - screenY)) {
                text[monsters[i].x - screenX][monsters[i].y - screenY] = monsters[i].rep;
                var s = monsters[i].n;
                if (s[0]=='T'&&s[1]=='h'&&s[2]=='e'){
                    s=s.substring(4);
                }
                relText[monsters[i].x - screenX][monsters[i].y - screenY] = s;
            }


        var nomore = 0; //No overlapping text... because that is freaking annoying.
        for (var i=0;i<sz*2;i++){
            for (var j=0;j<i;j++){
                //consider (j, sz-j)
                nomore--;
                if (relText[i-j][j] != ""){
                    if (nomore > 0) {
                        relText[i-j][j] = "";
                    } else { 
                        nomore = ~~(relText[i-j][j].length/7);
                    }
                }
                
            }
            nomore = 0;
        }

        text[Character.x - screenX][Character.y - screenY] = Character.rep();

        //Mark visibility
        var x0=Character.x - screenX, y0 = Character.y - screenY;
        var rad=6;

        for (var i=x0-rad+0.5;i<=x0+rad+0.5;i++){
            for (var j=x0-rad+0.5;j<=x0+rad+0.5;j++){
                if ( (i-x0)*(i-x0) +(j-y0)*(j-y0) <=rad*rad ){
                    //draw line from (x0,y0) to (i,j)
                    var nx,ny;
                    for (var d=0;d<100;d++){
                        nx=~~( d * (i-x0)/100)+x0, ny = ~~(d * (j-y0)/100)+y0;
                        if (nx>16||ny>16) continue;
                        vis[nx][ny] = true;
                        seen[nx+screenX][ny+screenY] = true; //replace t/f with "X""y"
                        if (text[nx][ny] == "#") break;
                    }
                }
            }
        }
        
        context = canv[cBuffer].getContext('2d');

        context.fillStyle = "#000000"
        context.fillRect(0,0,1000,1000);

        
        for (var i=0;i<sz;i++){
            for (var j=0;j<sz;j++){
                var cs = { ".":"black", "C":"red", "j":"blue","$":"gold","[":"cyan","g":"green"}; 
                var bcs = { ".":"white", "&nbsp;":"black" }; 
                if (!(t=vis[i][j])) if (seen[i+screenX][j+screenY]) text[i][j] = map[i+screenX][j+screenY]; else text[i][j] = "&nbsp;";
   
               //function writeTileGeneric(i, j, sz, type, vis){
                writeTileGeneric(i, j, 20, text[i][j], t);
                
                //if (s == ".") t.css("color",vis[i][j] ? "black" : "#cccccc");
            }
        } 

        canv[1-cBuffer].style.visibility = 'hidden';
        canv[cBuffer].style.visibility = 'visible';
        cBuffer = 1- cBuffer;

        //style="background-color:black;color:red" 
    } 
    function pickupItem(which, silence){
        var underfoot = [];
        for (i in items){
            if (intersect(items[i], Character)){
                underfoot.push(i);
            }
        }
        if (!underfoot.length) return false;
        if (underfoot.length == 1 || which != undefined){
            i = 0;
            if (which != undefined) i = which;
            i = underfoot[i];
            Inventory.addItem(items[i]);
            writeStatus("You pick up " + (items[i].count>1 ? "some " : "") +  items[i].n + ".");
            items.splice(i, 1);
            return true;
        }
        if (silence) return false;
        if (underfoot.length > 1){
            writeStatus("There are many items here. Press a number for a specific item, or A for all.");
            var list = [];
            for (i in underfoot){
                list.push(i + "-" + items[underfoot[i]].n);
            }
            renderList("Pick up what?", list);
            pickupMode=true;
            return false;
        }
        writeStatus("You swing your arms hopelessly at the ground, trying to find something.");
        return false;
    }

    var m = {//83:function(){writeStatus("You have " + Character.HP + "/" + Character.maxHP + " HP.<br> You have been playing for " + moves + " moves.")},
        71:pickupItem,
        83:function(){ 
            writeStatus("You take a quick nap."); resting = true;
        },
        73:function(){writeStatus("You take a moment to examine your inventory. Luckily, all monsters freeze in place. ");showInventory = true; Inventory.display();},
        76:function(){statschange = statpoints;},
        77:function(){showMap = !showMap;},
        //87:function(){writeStatus("Nice try. Too bad life isn't that easy.");},
        190:function(){if (pc == "&lt;") { writeStatus("You descend the staircase into darker depths..."); generateLevel(++curlevel, 0);} else {writeStatus("There's no downstair here.");} },
        188:function(){
            if (pc == ">") { 
                writeStatus("You ascend the staircase to safer ground."); 
                generateLevel(--curlevel,1); 
            } else {
                writeStatus("There's no upstair here.");
            } 
        }
    };
    /*
     * getKeys()
     *
     * Moves the character and consults a dictionary lookup to run special actions on keypress.
     */
    function getKeys(){
        //87-81-65-90-88-67-68-69
        Character.x += max(-1, min(1, -keys[68] - keys[87] +keys[65] + keys[88] + keys[90] - keys[69]));
        Character.y += max(-1, min(1, keys[67] - keys[81] - keys[87] + keys[68] - keys[65] + keys[88]));
        for (i in m) if (keys[i]) m[i]();

        var change = false;
        for (i in actionkeys) change |= keys[actionkeys[i]]; 
        
        return change;
    }


    /*
     * effect(t)
     *
     * Gives the character a certain status ailment (or benefit).
     *
     * Abstracted out so monsters can poison!
     */
    function effect(t){
        var ns = {t:15,rel:1,s:"STR",v:1,n:"+STR"};
        ns.n = t;
        
        if(t[0]=="P")ns.s="HP", ns.rel=0, ns.v=-1;
        if(t[0]=="R")ns.s="HP", ns.rel=0;
        t[0]=="I"? ns.s="INT":0;
        t[0]=="D"? ns.s="DEX":0;

        Character[ns.s] += ns.v; //First use for relative buffs (like regen) and ONLY use for nonrelative buffs (+1 STR etc)
        queue.push(ns);
    }

    var descriptors = [ [70,  "", {}],
                        [80,  " decent",  {"DMG":1, "DMX":2}],
                        [90,  " ancient", {"DMG":2, "DMX":4}], //FIXME 70-80-90
                        [100, " glowing", {"STR":2}]
                      ] ; 
                         
    var finalWDescs = [ [80,  "", {}],
                        [90, " of dexterity", {"DEX":1}],
                        [100, " of intelligence", {"INT":1}]
                      ];

    var typedescriptions = { "[" : ["sword", "mace", "dirk", "dagger", "longsword", "axe", "stabber", "pokey thing", "pair of boots", "helmet", "pair of legplates", "chestplate" ],
                             "(" : ["bow", "longbow"] 
    };
    var finaldescriptors = {// "[" : ["Truth", "bone", "cats", "Power", "purity", "steel", "bronze", "iron", "Mythril", "Light", "kittenfur"],
                             "!" : ["Regeneration", "Poison", "Strength", "Intelligence","Dexterity"],
                             "?" : ["teleport", "money", "healing", "stabbing self", "experience", "worthlessness", "curse", "enchant I", "enchant II"]
    };
    var tnarg = {stacks:false, count:1,x:-1,y:-1,ists:true,cls:"*",n:"The Talisman of Tnarg", N:function(){}};  //Unique

    function teleport(){
        var x,y;
        do{
            x = rsp(0,size);
            y = rsp(0,size);
        } while (map[x][y] == "#");
        Character.x=x;
        Character.y=y;
        writeStatus("Hm...Where are you?");
    }
    function Item(x, y, forcecls, forcespec, forcename, forcetyp){
        this.x=x;
        this.y=y;
        this.stacks=true; //Can multiples of these take up just 1 inventory slot?
        this.count=1; //only important when you have one in your inventory
        this.cls = "";
        this.equipped = false;
        this.spec = {}; 
        this.N=function(known){
            if(this.cls=="?"){
                this.n = "a scroll of " + (this.typ in wielding || known ? this.typ : "mystery");
            } else { 
                this.n= this.cls=="!"? "a potion of " + (this.typ in wielding || known ? this.typ : "mystery" ) : this.n;
            }
        } 
        this.getTag = function(){
            if(this.typ == "arrows" || this.cls == "$") return "";
            var tag="(";
            if (this.typ == "w"){
                tag += this.spec["DMG"]+"-"+this.spec["DMX"] + ", ";
            }
            for (s in this.spec){
                if (s != "DMG" && s != "DMX" && this.spec[s] > 0)
                    tag += "+"+this.spec[s] +" " + s + ", ";
            }
            return tag.substring(0,tag.length-2) + ")"; //trim last comma
        }
        this.n = "";
        this.typ="";
        this.d="";
        this.wtyp="";
        this.getDescriptor = function(desc){
            var r = ~~(Math.random()*100); //TODO: Let level modify this.
            for (x in desc){
                if (desc[x][0] >= r){ //prob
                    for (s in desc[x][2]){ //specs
                        this.spec[s] = (this.spec[s] ? this.spec[s]:0) + desc[x][2][s];
                    }
                    return desc[x][1];
                }
            }
        }
        this.init = function(forcecls, forcespec, forcename, forcetyp) {  //TODO don't have to pass these in?
            with(this){     
                t = cls = forcecls || relem(["!", "(","|", "[", "$", "?"]);
                
                if (forcespec){
                    spec = forcespec;
                } else { 
                    if (t == "$"){
                        spec["money"] = -rnd(curlevel, (1+curlevel)*7);
                        n="$";
                    }

                    if (t == "("){
                        stacks = false;
                        d = relem(typedescriptions[t]); 
                        typ="w";
                        spec["DMX"] = (spec["DMG"]= 2*curlevel) + 2*curlevel; //Bows are weaker than swords for obvious reasons
                        n ="a"+  getDescriptor(descriptors) + " " + d + getDescriptor(finalWDescs);
                    }
                    if (t == "|"){ //Bolts/arrows for bow.
                        stacks = true;
                        count = rnd(20,25);
                        typ = n = "arrows"
                    }

                    var d2;
                    if (t== "["){
                        stacks = false; //Each weapon is considered unique.
                        //x to y damage
                        //+N to strength
                        d2=rnd(0,typedescriptions["["].length-1);
                        d = typedescriptions[t][d2];
                        if (d2<8){ 
                            spec["DMX"] = (spec["DMG"]= 3*curlevel) + curlevel*2;
                            spec["STR"] = max(0,rnd(0,100)-95);
                            typ="w";
                        } else { 
                            spec["DEF"]=rsp(~~((d2-7)/2),~~(curlevel/4))+1;
                            typ =typedescriptions[t][d2];
                        }
                        n= "a"+ getDescriptor(descriptors)  + " " +  d +  getDescriptor(finalWDescs);
                    }
                    if (t== "!" || t == "?"){
                        typ = relem(finaldescriptors[t]);
                    }
                }
                n = forcename || n;
                cls = forcecls || cls;
                typ = forcetyp || typ;
                n += getTag();

                //wtyp = cls;
                //if (cls=="(") wtyp = "[";
            }
        }
        this.use = function() {
            with(this){ 
                var s=spec,c=cls, fb="You feel better.";
                if (c=="?"){
                    writeStatus("You read the scroll.");
                    showInventory = false;
                    //for now, just teleport.
                    //

                    //"?" : ["teleport", "money", "healing", "stabbing self", "experience", "worthlessness", "curse", "enchant I", "enchant II"]
                    if (typ[0]=="t"){
                        teleport();
                    } else if (typ[0] == "m"){
                        Character.money += rsp(5,100);
                        writeStatus("The scroll turns into gold!");
                    } else if (typ[0] == "s"){
                        Character.HP -= 7;
                        writeStatus("The scroll stabs you!");
                    } else if (typ[0] == "h"){
                        Character.HP += 8;
                        writeStatus(fb);
                    } else if (typ[0] == "e"){
                        writeStatus("You feel experienced.");
                        Character.EXP+=curlevel*5;
                    } else if (typ[0] == "w"){
                        writeStatus("Your nose itches.");
                    }
                    boardUpdate = true;
                } else {
                    if (equipped) { 
                        for (x in s) Character[x] += s[x] != null ? s[x] : 0;
                        if (c=="!") {
                            //Potion types: ["Regeneration", "Poison", "Strength", "intelligence","Defense"]
                            effect(t=typ);

                            writeStatus("The potion tastes like " + t + "!"); //Heheheh 
                            //queue.push({t:15,rel:0,s:"HP",v:-1,n:"poison"});
                        }
                        if (c=="[") writeStatus("You wield the object. You can't wait to pwn some noobs.");
                    } else { 
                        for (x in s) Character[x] -= s[x] != null ? s[x] : 0;
                        if (c=="[") writeStatus("You unwield the object.");
                    }
                }
            }
            if (c == "$" || c == "!" || c=="?") {
                this.equipped = false; //TODO I shouldn't have to do this... code restructuring maybe... too tird to figure out
                return !--this.count; //TODO potential bug if there is 0 beforehand, but then again, that's a bug in itself.
            }

            return false;
        }
        this.init(forcecls, forcespec, forcename, forcetyp); 
    }

    //follow: 0 = never. 1 = after attacked. 2 = always, 3 = never moves...
    //if not defined ignore them (flock)
    //lvl = min level to encounter on

    /*
     * Store monster properties in a bar delimited string.
     *
     * Character|Full name|Minimum level to encounter|Damage (low)|Damage (high)|Hit points|Follow flag|Agility|Poison
     *
     * Special notes about AGL: AGL determines how fast a monster can move compared to you. 5 means just as fast. 0 means never moves. 9 means doublespeed, almost.
     *
     * Special notes about poison: Only tack on the 1 at the end if a monster poisons. Don't tack it on if it doesn't.
     *
     */
    ms = ["c|cobol|1|3|5|14|0|3",
          "r|rat|1|2|3|8|1|4",
          "g|goblin|1|3|4|16|1|1",
          "j|jerk|2|2|6|9|1|2",
          "s|slime|3|6|12|20|1|3",
          "S|snake|4|6|12|20|1|7|1"
         ]
    var MNS=ms.length;

    /*
     * Note! Never make a unique monster's name start with Y.
     *
     * Don't ask why.
     */
    ums = ["U|Andrius|1|2|4|30|1|6",
           "U|Dmitri|1|2|5|24|1|6"
        ];

    var UMNS=ums.length;
    function Monster(x, y, l, uniq) { 
        if (uniq){
            do s=this.stats = ums[this.z=rsp(0,UMNS)].split("|"); while(this.stats[2]>l);
        } else { 
            do s=this.stats = ms[this.z=rsp(0,MNS)].split("|"); while(this.stats[2]>l);
        }
        this.u=uniq;
        this.rep = s[0]; 
        this.x = x;
        this.y = y;
        this.STR = 0;
        this.DMG = s[3]-0; // almost certainly the shortest way to cast to int
        this.DMX = s[4]-0;
        this.AGL = s[7]-0;
        this.POI = !!s[8]; //T if exists, F otherwise. 
        this.DEF = 1;
        this.n = this.u ? s[1] : "The " + s[1];
        this.hsh = rnd(0,1e9);
        this.maxHP = this.HP = s[5]; //TODO: Randomize?
        this.follow = s[6]-0;
        this.update = function(oldP) {
            if (intersect(this, Character)) {
                if (!wieldingBow)
                    dodmg(Character,this);
                else
                    writeStatus("You can't melee while wielding a bow!");
                if (this.HP > 0 || this.AGL > Character.AGL) dodmg(this,Character);

                setxy(Character, oldP);
            } else { 
                with(this){ 
                    if (this.follow==3) return;
                    var mvs = ~~(AGL/5) + ~~((AGL%5+rnd(0,5))/5);
                    for (var i=0;i<mvs;i++){ 
                        var op = {x : this.x, y: this.y};
                        if (follow && abs(Character.x - x) + abs(Character.y - y) < 16){ 
                            x != Character.x ? ( x>Character.x? x--: x++):0;
                            y != Character.y ? ( y>Character.y? y--: y++):0;
                        } else { 
                            x += rnd(0,2)-1;
                            y += rnd(0,2)-1;
                        }
                        for (i in monsters) if (hsh!=monsters[i].hsh && intersect(this,monsters[i])) setxy(this, op);
                        if (map[x][y] == "#") setxy(this, op) 
                        if (intersect(this, Character)) {
                            dodmg(this,Character); //TODO even better is a recursive call.
                            x=op.x;
                            y=op.y;
                        }
                    }
                }

            }
        }; 
    }; 

    var Character = { 
        x : 5,
        y : 8,
        MP : 5,
        HP : 23,
        oldHP : 23, //For updating purposes
        oldLV : 1, //For updating purposes
        maxHP : 24,
        money : 0,
        DMG : 2, 
        DMX : 5, 
        AGL : 4,
        EXP : 0, 
        NXT : 10,
        INT : 2,
        STR : 2,
        DEX : 2,
        DEF : 1,
        LVL : 1,
        deaths : 0,
        revealm : false, //Reveal monsters spell.
        reveali : false, //Reveal items spell.
        n : "You",
        rep : function() { 
            return (this.HP == this.maxHP) ? "@" : (this.HP / this.maxHP).toString()[2];
        }
    };

    function Inven() {
        this.sel = 0;
        this.items = [];
        this.addItem = function(itm){
            var li;
            if (this.items.length>15) {
                writeStatus("You are carrying too much!"); 
                return;
            } 

            if (itm.stacks){
                var hash = itm.n + itm.typ; //This is a fairly unique way to represent items
                //Try to stack it first.
                for (li in this.items){
                    if (this.items[li].n +  this.items[li].typ == hash){
                        this.items[li].count+=itm.count;
                        return;
                    }
                }
            }
            //Either stacking failed or it doesn't stack at all.
            this.items.push(itm);
        }
        this.useItem = function(){
            var a=this.items[this.sel];
            if (!a) return; 
            if (!a.equipped){
                //about to equip
                if (wielding[a.typ]) {  //TODO. I should make a flag that is individual to each wielded item...

                    //Unequip any other equipped item of that type
                    var success = false;
                    for (x in this.items){
                        if (this.items[x].equipped && this.items[x].typ == a.typ){
                            var oldsel = this.sel;
                            this.sel = x;
                            success = this.useItem();
                            this.sel = oldsel;
                            break;

                        }
                    }
                    if (!success)
                        return;
                }
            }
            wielding[a.typ] = !wielding[a.typ]; //This accounts not only for weapons and armor, but also for seen items (e.g. potions).
            if(a.cls=="(") wieldingBow = wielding[a.typ];
            a.equipped = !a.equipped;
            if (a.use()){
                this.items.splice(this.sel, 1);
            }
            return true; //success. Note: Return false if the item is cursed and you are trying to unequip it.
        }
        this.dropItem = function(){
            var a=this.items[this.sel];
            if (!a) return;

            if (a.equipped) this.useItem();
            setxy(a,Character);
            items.push(a);
            this.items.splice(this.sel, 1);
        } 
        this.display = function(known){ //known -> force all objects to be known when looking (e.g. for shops)
            var list = [];
            for (i in this.items){
                var c = this.items[i];
                var desc = "";
                if (this.sel==i) desc += "*"; else desc+= c.equipped ? "+" : "-"; 
                c.N(known);
                desc += c.count + "x " + c.n + (c.equipped ? "[equipped]" : ""); 
                list.push(desc);
            }
            renderList("Inventory", list);
        }
        this.getKeys = function(){
            this.sel += keys[88] - keys[87]; 
            if (keys[13]) this.useItem(); 
            if (keys[68]) this.dropItem();

            this.sel = max(0, min ( this.items.length - 1,this.sel));
            if (keys[27]) //ESC
                showInventory = false; 
        }
        this.hasTalis = false;
    };

    var Inventory;

    /* Generically writes a list to screen.
     * See also Inventory, Highscore, To-do (if I ever get around to it...which I didn't)
     */
    function writegenericlist(x,s){
        $("#board > span").html("").css({"background-color":"","color":""});
        for (i in x) $("#"+i+"F0").html(( s==i ? "*" : (x[i].equipped ? "+" :  "-"))+ (x[i].s?x[i].s:"") + x[i].n+ (x[i].equipped ? "[equipped]" : "") );
    }

    /*
     * ssXY()
     *
     * Sets the position of the screen as to follow the character.
     *
     * I suspect that this function shouldn't need to be called from as many places as it is (3).
     *
     */
    function ssXY(){
        console.log(Character.x, Character.y);
        screenX = Character.x - sz/2;
        screenY = Character.y - sz/2;
    }

    initialize(); 

});

