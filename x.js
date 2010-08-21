//Typekit.load();
$(function(){


    var keys=[],
        vis=[],
        seen=[], 
        is=0, actionkeys = [65, 87, 68, 83, 81,69,90,67,188, 190], sz = 16, map = [], REGENRATE=25, monsters = [], items = [], tr, inventory = [], showInventory = resting = false, moves = 0, statschange = false , statpoints = 0, screenX = screenY = curlevel= 0, size, t=0, pc,B="<br/>",wielding={}, oldPosition, queue=[],usd={}, st="",ranging=false,whichTarget=-1,showMap=false, shop, dungeonCache=[], wieldingBow = false;

    while (t++<=255) keys[t] = false;

    $(document).keydown (
        function(e){
            t = e.which;
            console.log(t);
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
        b.HP -= t=max(0,rnd(a.DMG, a.DMX+1)-b.DEF+a.STR); 
        writeStatus(a.n + " hit" + (a.n[0]=="T"?"s":"") +  " for " + t + " damage.");
        if (a.POI && rnd(0,10)==0) {effect("poison"); writeStatus("You have been poisoned!")}

        if (b.HP < 0){ //FIXME and b is not Character
            writeStatus("Holy crap! "+b.n+" explodes in a huge explosion of blood! It's really gross!");
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
        scr.sort(function(a,b){return (a[1]-0)-(b[1]-0)});
        writegenericlist(scr,0);
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

        $("#dbg").html( $("#dbg").html() + B + "DLevel: " + l + " Dir: " + d + " STR: " + Character.STR + " CON: " + Character.CON + " DHI: " + Character.DMX + " CLVL: " + Character.LVL + " EXP: " + Character.EXP);
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
        console.log(dungeonCache);

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
        size = buff*2+25* rsp(2,min(l/2+1,16)),roomn = rsp(2*size/40, 6*size/40);

        map=[];a=b=0;while(a++<size){map.push([]);while(b++<size)map[a-1].push("#");b=0}
        //map = rng(size).map(function(){return rng(size).map(fgen("#"))}); 
        var rooms=[],r, loops=0,cr;
        var t, q;
        nn = roomn = ~~(roomn);
        while(roomn--){
            (r={}).x=rnd(buff,size-buff-15);r.y=rnd(buff,size-buff-15);
            r.w=r.h=rnd(12,15);
            rooms.push(r);
        }

        for (ro in rooms){
            var wroom = Math.random() > .5;
            for (var x=(cr=rooms[ro]).x;x<cr.x+cr.w;++x){
                for (var y=cr.y;y<cr.y+cr.h;++y){
                    (q = rnd(0,999)) < 4 ? items.push(new Item(x,y)) :( q < 10 ? monsters.push(new Monster(x,y,l)) : 0); 
                    map[x][y] = wroom?"~":".";
                }
            }
        }
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


        map[(up=relem(rooms)).x+3][up.y+3] = ">";
        if (curlevel != 15){ 
            map[(dn=relem(rooms)).x+4][dn.y+4] = "&lt;";
        } else {
            tnarg.x = (dn=relem(rooms)).x+4;
            tnarg.y = dn.y+4;

            items.push(tnarg);
        }
        
        seen=[];a=b=0;
        while(a++<size){seen.push([]);while(b++<size)seen[a-1].push(false);b=0}

        //seen= rng(size).map(function(){return rng(size).map(fgen(false))}); 

        t=up;//relem(rooms); //TODO definitely not here :)
        map[t.x][t.y] = "&";
        shop = new Shop(t); //TODO make it more random

        /*
         * Unique items.
         *
         * If I'm running out of space (unlikely...) then TODO i can make this into a bar delimited string like normal.
         */
        var Uniques = [{name: "The Greatsword (unique)", cls:"[", spec: {"STR": 5, "DMG":10, "DMX":15}}]; 
        var uni = new Item(t.x+1, t.y+1, Uniques[0].cls, Uniques[0].spec, Uniques[0].name);
        items.push(uni);

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

    function writeks(d){
        var s="";
        for (k in d)
            s += " <b>"+k+"</b>:" + d[k]+ " |";
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
     * TODO: Make it autopickup other types of items.
     */
    function intersectItems(){
        for (i in items){
            items[i].N(); //Ensure that it has the correct name.
            if (intersect(Character, items[i])){
                 if (items[i].cls == "$"){
                    items[i].use();
                    items.splice(i,1); //TODO: code duplication --sorta :: BAD (maybe have an "in inventory" flag?)
                    writeStatus("You have "+Character.money+"G.");
                    break;
                 } else writeStatus(items[i].n + " rolls under your feet.");
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
        writeks({"D":"efense","S":"trength","C":"onstitution"});
        t = {68:"DEF",83:"STR",67:"CON"};
        $("#1F1").html("Gain a stat: (D)efense (S)trength (C)onstitution." );
        
  
        for (x in t) if (keys[x]) {Character[t[x]]++; writeStatus(--statpoints + " points left.");}
        statschange = statpoints>0;
    }

    /*
     * statusEffects()
     *
     * Deals with buffs from potions, as well as poison from monsters, and maybe even others.
     */

    function statusEffects(){
        st={};
        for (V in queue){
            t=queue[V];
            st[t.n]=(!!st[t.n])+1; //deep dark magic
            if (t.t--<0){
                queue.splice(V, 1);
                if (t.rel) t.v*=-1; t.rel=0;
            }
            if (!t.rel) Character[t.s]+=t.v;
        }
    }

    //TODO make dodmg accept a number to override amount of damage dealt - or something like that...
    var spells = [ {n:"Magic dart", /*rng: 5,*/ effect:function(you, them){ dodmg(you, them); },cost:1  },
                   {n:"Heal", effect:function(you, them){ you.HP += 5; }, cost:2 } 
                 ];

    function rangeAction(){
        //TODO call immediately when 88 is pressed.
        writeks({"e":" List avaiable spells", "X":" Cycle through monsters","Enter":"Fire", "ESC" : " Cancel"});

        if (keys[69]) { //List spells
            for (t in spells){
                $("#"+t+"F0").html( (t-0+1) + ": " + spells[t].cost + "MP - " + spells[t].n );
            }
        }
        //49 == 1
        //50 == 2 
        //...

        /*
         * This snippet is for casting spells.
         */
        for (x in spells){
            if (keys[x-0+49] && Character.MP > spells[x].cost){
                //Character.MP -= spells[x].cost;
                spells[x].effect(Character, monsters[whichTarget]);
                keys[x-0+49] = false;

                return true; //action has been taken
            }
        }

        /*
         * This snippet is to find the next available target.
         */
        if (keys[88]) {
            var di=1e6; //Infinity for all practical purposes

            var start = whichTarget;
            //Find the next visible monster
            do { 
                whichTarget++;
                whichTarget %= monsters.length;
                var m = monsters[whichTarget];
                if (bounded(m.x-screenX) && bounded(m.y-screenY) && vis[m.x-screenX][m.y-screenY]) break;
            } while (di > 1e5 && whichTarget != start)
            
            //TODO
            //If we haven't found a target, set whichTarget back to -1 (so that we know we aren't targetting anything)
            //Also writeStatus("No monsters in range") and go out of ranged mode.
        }


        keys[88] = false;
        if (keys[27]) {
            ranging=false;
            whichTarget=-1;
        } 

        /* 
         * This snippet is for ranged attack (with a bow)
         *
         * TODO: The arrows should drop to the ground when you attack, sometimes.
         */
        if (keys[13]){
            if (wieldingBow){ 
                for (it in Inventory.items){ 
                    t= Inventory.items[it];
                    if (t.equipped && t.cls=="|" && t.count-->0){
                        if (dodmg(Character, monsters[whichTarget])){
                            whichTarget = -1;
                            ranging = false;
                        }
                        keys[13] = false;
                        return true; //action has been taken
                    }
                }
                writeStatus("You must wield arrows along with your bow.");
            } else {
                writeStatus("You must wield a bow before you attack from a distance.");
            }

        }
        //TODO: 
        //Let all the keys be reset by that helper function.

        //writeBoard();

        return false;

    }
    function takeTurn(){
        pc=map[Character.x][Character.y]; 
        statusEffects(); 

        moves++;
        Character.HP += resting + (!moves%REGENRATE && Character.HP != Character.maxHP)
        if (pc == "#") {setxy(Character,oldPosition); writeStatus("You stupidly run into a rock.");} 
        for (i in monsters) monsters[i].update(oldPosition);
        
        intersectItems();
        if (pc == "&") writeStatus("You see a store!");
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
        s="";for (x in st)s += x + " x " + st[x] + B;
        $("#hlth").html(" $: " + Character.money +B+ " Level: " + Character.LVL +B+ " Experience: " + Character.EXP + "/" + Character.NXT +B+ "HP: " + Character.HP + "/" + Character.maxHP +B+ " Damage: " + (Character.DMG + (t=Character.STR))+  "-" + (Character.DMX +t)+ B+  " Strength: " +t  +B+" Constitution: " + Character.CON +B+ " Defense: " + Character.DEF +B+ " Dungeon Level:" + curlevel +B + s);
    }
    /*
     * drawMap()
     *
     * Renders a minimap to screen. Awesome.
     *
     * TODO: It would be neat if this would automatically be in the lower right side - like in Zelda or something.
     */
    function drawMap(){
        for (var i=0;i<size;i++){
            for (var j=0;j<size;j++){
                //todo: make the person show up as a glowing dot on the map
                //todo: for larger maps, scale down the 3-factor
                writeTileGeneric(j, i, 3, map[j][i],  seen[j][i]);
            }
        }

        if (keys[27]){
            showMap = false;
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

        Character.maxHP = Character.CON*7 + 10*Character.LVL; 

         for (i in inventory) inventory[i].N() 

         Character.HP=min(Character.HP,Character.maxHP);
         renderSidebar();


        if (statschange) {
            checkStatsChange(); 
            return;
        }
        if (showInventory){
            writeks({"Enter":" Use","ESC":" close Inventory","D":"rop"});
            $("#c").html("Inventory");
            Inventory.getKeys();
            Inventory.display();
            if (!showInventory) ssXY();
            return;
        }
        if (showMap){
            drawMap();
            return;
        }

        checkLevelUp();

        if (Character.HP<0) {writeStatus("You have died. :("); end(0);}

        $("#c").html("Rogue");
        writeks({"WASD":" Move", "QEZC":" Diag", "R":"est (heal)","I":"nventory","G":"rab item", "Walk into a monster":"Attack",
                "<br>>":" Go upstairs","<":" Go downstairs", "x":" Range","M":"ap" });

        action = (ranging && rangeAction()) || getKeys();
        if (action || resting) { 
            resting = !(action || Character.HP == Character.maxHP) 
            takeTurn();
        }

        if (!tr) writeBoard(); 
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

    function initialize(){
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

        //function(forcecls, forcespec)

    }
    function bounded(x){
        return x>=0 && x<sz;
    }

    var canv= document.getElementById("canvas");
    var context = canv.getContext('2d');
    function wTile(x,y,r,g,b,sz){ //Xpos, Ypos, (RGB), size
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
        } */
    }

    function writeTileGeneric(i, j, sz, type, vis){
        if (type == ".")  
            wTile(j,i,"55",vis?"ff":"bb","55",sz);

        if (type == "~")  
            wTile(j,i,"55","55",vis?"ff":"bb",sz);

        if (type == "#")  
            wTile(j,i,"66","66","66",sz);

        if (type == "&")  
            wTile(j,i,"00","00","00",sz);
        
        if (type == "&nbsp;")
            wTile(j,i,"00","00","00",sz);

        if (type == "c" || type == "j" || type == "g" || type == "r")
            wTile(j,i,"ff","55","55",sz);

        if (type == ">" || type == "<")
            wTile(j,i,"66","66","33",sz);

        if (type == "!" || type == "?" || type == "[")
            wTile(j,i,"dd","dd","55",sz);

        if (whichTarget != -1 && monsters[whichTarget].x - screenX == i && monsters[whichTarget].y-screenY == j)
            wTile(j, i, "33", "33", "33", sz);
    }

    function writeBoard(){
    
        var text = [];
        vis = [];
        var html = "";

        vis=[];a=b=0;while(a++<sz){vis.push([]);while(b++<sz)vis[a-1].push(0);b=0}

        //vis = rng(size).map(function() {return rng(size).map(fgen(0))}); 

        for (var i=0;i<sz;i++) { 
            text.push([]); 
            for (var j=0;j<sz;j++) text[i].push(map[i+screenX][j+screenY]);
        }  

        //TODO abstract out bounded into a function on the object.. or do one better and dont put it on the object...
        for (i in items) if(bounded(items[i].x - screenX) && bounded(items[i].y - screenY)) text[items[i].x - screenX][items[i].y - screenY] = items[i].cls;

        for (i in monsters) if(bounded(monsters[i].x - screenX) && bounded(monsters[i].y - screenY)) text[monsters[i].x - screenX][monsters[i].y - screenY] = monsters[i].rep;

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
                        //debugger;
                        //console.log(vis);
                        vis[nx][ny] = true;
                        seen[nx+screenX][ny+screenY] = true; //replace t/f with "X""y"
                        if (text[nx][ny] == "#") break;
                    }
                }
            }
        }
        
        //TODO consolidate with other thing... 
        
        //console.log(text[ox-screenX,oy-screenY]);

        context.clearRect(0,0,500,500);

        
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

        //console.log($("#"+(ox-screenX)+"F"+(oy-screenY)).html());


        //style="background-color:black;color:red" 
        //for (i in text) html += text[i].join("") + B;

        //$("#board").html(html);
    } 
    function pickupItem(){
        for (i in items){
            if (intersect(items[i], Character)){
                Inventory.addItem(items[i]);
                items.splice(i, 1);
                writeStatus("You pick an item up off the ground.");
                return;
            }
        }
        writeStatus("You swing your arms hopelessly at the ground, trying to find something.");
    }

    var m = {//83:function(){writeStatus("You have " + Character.HP + "/" + Character.maxHP + " HP.<br> You have been playing for " + moves + " moves.")},
        71:pickupItem,
        82:function(){ 
            writeStatus("You take a quick nap."); resting = true;
        },
        73:function(){writeStatus("You take a moment to examine your inventory. Luckily, all monsters freeze in place. ");showInventory = true; Inventory.display();},
        76:function(){statschange = statpoints;},
        88:function(){ranging = !ranging; rangeAction()},
        77:function(){showMap = !showMap;},
        //87:function(){writeStatus("Nice try. Too bad life isn't that easy.");},
        188:function(){if (pc == "&lt;") { writeStatus("You descend the staircase into darker depths..."); generateLevel(++curlevel, 0);} else {writeStatus("There's no staircase here.");} },
        190:function(){
            if (pc == ">") { 
                writeStatus("You ascend the staircase to safer ground."); 
                generateLevel(--curlevel,1); 
            } else {
                if (pc == "&") shop.display(); 
                else writeStatus("There's no staircase here.");
            } 
        }
    };
    /*
     * getKeys()
     *
     * Moves the character and consults a dictionary lookup to run special actions on keypress.
     */
    function getKeys(){
        Character.x += max(-1, min(1, -keys[69] - keys[81] +keys[90] + keys[67] + keys[83] - keys[87]));
        Character.y += max(-1, min(1, keys[68] - keys[65] - keys[81] + keys[69] - keys[90] + keys[67]));
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
        
        if(t[0]=="p")ns.s="HP", ns.rel=0, ns.v=-1;
        if(t[0]=="r")ns.s="HP", ns.rel=0;
        t[0]=="c"? ns.s="CON":0;
        t[0]=="d"? ns.s="DEF":0;

        Character[ns.s] += ns.v; //First use for relative buffs (like regen) and ONLY use for nonrelative buffs (+1 STR etc)
        queue.push(ns);
    }

    var descriptors = ["cool", "decent", "lame", "noobesque"];
    var typedescriptions = { "[" : ["sword", "mace", "dirk", "dagger", "longsword", "axe", "stabber", "pokey thing", "pair of boots", "helmet", "legplates", "chestplate" ],
                             "!" : ["vial", "potion", "tonic"], //TODO, I never use these
                             "(" : ["bow", "longbow"] 
    };
    var finaldescriptors = { "[" : ["Truth", "bone","cats", "Power", "purity", "steel", "bronze", "iron", "Mythril", "Light", "kittenfur"],
                             "!" : ["regeneration", "poison", "strength", "constitution","defense"] 
    };
    var tnarg = {x:-1,y:-1,ists:true,cls:"*",n:"The Talisman of Tnarg"};  //Unique
    function Item(x, y, forcecls, forcespec, forcename){
        this.x=x;
        this.y=y;
        this.stacks=true; //Can multiples of these take up just 1 inventory slot?
        this.count=1; //only important when you have one in your inventory
        this.cls = "";
        this.equipped = false;
        this.spec = {}; 
        this.N=function(known){
            this.n= this.cls=="!"? "A potion of " + (this.typ in wielding || known ? this.typ : "mystery" ) : this.n;
        } 
        this.n = "";
        this.typ="";
        this.d="";
        this.init = function(forcecls, forcespec) { 
            with(this){     
                t = cls = forcecls || relem(["!", "(","|", "[", "$", "?"]);
                
                if (forcespec){
                    spec = forcespec;
                } else { 
                    if (t == "$"){
                        spec["money"] = -rnd(curlevel, (1+curlevel)*7);
                    }
                    if (t == "?"){
                        //TODO: Scrolls should not be randomized.
                        n = "unidentified scroll";
                    }
                    if (t == "("){
                        stacks = false;
                        d = relem(typedescriptions[t]); 
                        typ="w";
                        spec["DMX"] = (spec["DMG"]= rnd(2*curlevel, 3*curlevel)) + rnd(1,3+curlevel*2);
                        n = relem(descriptors) + " " + d + " of " + relem(finaldescriptors["["]); 
                    }
                    if (t == "|"){ //Bolts/arrows for bow.
                        stacks = true;
                        count = rnd(20,25);
                        typ = n = "Arrows"
                    }

                    var d2;
                    if (t== "["){
                        stacks = false; //Each weapon is considered unique.
                        //x to y damage
                        //+N to strength
                        d2=rnd(0,typedescriptions["["].length-1);
                        d = typedescriptions[t][d2];
                        if (d2<8){ 
                            spec["DMX"] = (spec["DMG"]= rnd(2*curlevel, 3*curlevel)) + rnd(1,3+curlevel*2);
                            spec["STR"] = max(0,rnd(0,100)-95);
                            typ="w";
                        } else { 
                            spec["DEF"]=rsp(~~((d2-7)/2),~~(curlevel/4))+1;
                            typ =typedescriptions[t][d2];
                        }
                        n=  relem(descriptors)  + " " +  d +  " of "+relem(finaldescriptors[t]);
                    }
                    if (t== "!"){
                        typ = relem(finaldescriptors[t]);
                        spec["HP"] = rnd( curlevel*2+1, (curlevel+3)*6);
                    }
                }
                n = forcename || "A " + n;
                cls = forcecls || cls;
            }
        }
        this.use = function() {
            with(this){ 
                var s=spec,c=cls, fb="You feel better.";
                if (c=="?"){
                    writeStatus("You read the scroll.");
                    showInventory = false;
                    //for now, just teleport.
                    var r=rnd(0,100);
                    if (r>70){ 
                        var x,y;
                        do{
                            x = rsp(0,size);
                            y = rsp(0,size);
                        } while (map[x][y] == "#");
                        Character.x=x;
                        Character.y=y;
                        writeStatus("Hm...Where are you?");
                        return;
                    } 
                    (r>65) ? //TODO THIS IS MAJORLY ABSTRACTABLE, much in the same way as potions O_O they are almost the same...
                        (Character.money += (t=rsp(5,100)),
                        writeStatus("The scroll turns into gold!"))
                    : (r>50) ? 
                        (Character.HP += 30,
                        writeStatus(fb))
                    : (r>35)?
                        (Character.HP -= 10,
                        writeStatus("OUCH!"))
                    : (r>30)?
                        (statpoints++,
                        writeStatus("You gain a stat point! (L)"))
                    : (r>20) ?
                        (writeStatus("You feel experienced."),
                        Character.EXP+=curlevel*8)
                    :  (writeStatus("Nothing happens."))
                } else {
                    if (equipped) { 
                        for (x in s) Character[x] += s[x] != null ? s[x] : 0;
                        if (c=="!") {
                            //Potion types: ["Regeneration", "Poison", "Strength", "Constitution","Defense"]
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
            return (c == "$" || c == "!" || c=="?"); //destroy
        }
        this.init(forcecls, forcespec, forcename); 
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
    ms = ["c|cobol|1|5|3|14|0|3",
          "r|rat|1|2|3|8|1|4",
          "g|goblin|1|3|4|16|1|1",
          "j|jerk|2|2|6|9|1|2",
          "s|slime|3|6|12|20|1|3",
          "S|snake|4|6|12|20|1|7|1"
         ]
    var MNS=ms.length;


    function Monster(x, y, l) { 
        do s=this.stats = ms[this.z=rsp(0,MNS)].split("|"); while(this.stats[2]>l);
        this.rep = s[0]; 
        this.x = x;
        this.y = y;
        this.STR = 0;
        this.DMG = s[3]-0; // almost certainly the shortest way to cast to int
        this.DMX = s[4]-0;
        this.AGL = s[7]-0;
        this.POI = !!s[8]; //T if exists, F otherwise. 
        this.DEF = 1;
        this.n = "The " + s[1];
        this.hsh = rnd(0,1e9);
        this.maxHP = this.HP = s[5]; //TODO: Randomize?
        this.follow = s[6]-0;
        this.update = function(oldP) {
            if (intersect(this, Character)) {
                dodmg(Character,this);
                this.follow=1;
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
        maxMP : 5,
        HP : 24,
        maxHP : 24,
        money : 0,
        DMG : 2, 
        DMX : 5, 
        AGL : 4,
        EXP : 0, 
        NXT : 10,
        CON : 2,
        STR : 2,
        DEF : 1,
        LVL : 1,
        n : "You",
        rep : function() { 
            return (this.HP == this.maxHP) ? "@" : (this.HP / this.maxHP).toString()[2];
        }
    };

    function Shop(r) { //The shop is initialized in room r.
        this.x=r.x+5;
        this.y=r.y+5;
        this.items = [];
        this.name = "";
        this.inv = new Inven();
        this.display = function(){
            this.inv.display();
        }

        //Initialization
        //TODO for cuteness sake: add "Waterfront" if it is in the water (lol)
        var owner=relem(["Gregor's", "Lydia's", "Eddard's"]);
        var type=relem(["Potionista", "Armory", "Scrolls", "Sundries"]);

        for (var x=0;x<rnd(5,9);x++){
            this.inv.addItem(new Item("?"));
        }
    }

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
                var hash = itm.t + itm.typ; //This is a fairly unique way to represent items
                //Try to stack it first.
                for (li in this.items){
                    if (this.items[li].t + this.items[li].typ == hash){
                        this.items[li].count++;
                        return;
                    }
                }
            }
            //Either stacking failed or it doesn't stack at all.
            this.items.push(itm);
        }
        this.useItem = function(){
            var a=this.items[this.sel];
            if (!a.equipped){
                //about to equip
                if (a.cls=="["&&wielding[a.typ]) { 
                    writeStatus("You can't wield another item of that type."); 
                    return;
                }
            }
            wielding[a.typ] = !wielding[a.typ]; //This accounts not only for weapons and armor, but also for seen items (e.g. potions).
            if(a.cls=="(") wieldingBow = wielding[a.typ];
            a.equipped = !a.equipped;
            if (a.use()){
                this.items.splice(this.sel, 1);
            }
        }
        this.dropItem = function(){
            var a=this.items[this.sel];

            if (a.cls=="[" && a.equipped){
                itemuse();
            }
            setxy(a,Character);
            items.push(a);
            inventory.splice(this.sel, 1);
        } 
        this.display = function(known){ //known -> force all objects to be known when looking (e.g. for shops)
            $("#board > span").html("").css({"background-color":"","color":""});
            for (i in this.items){
                var c = this.items[i];
                var desc = "";
                if (this.sel==i) desc += "*"; else desc+= c.equipped ? "+" : "-"; 
                c.N(known);
                desc += c.count + "x " + c.n + (c.equipped ? "[equipped]" : ""); 
               $("#"+i+"F0").html(desc);
            }
        }
        this.getKeys = function(){
            this.sel += keys[83] - keys[87]; keys[83]=keys[87]=false;
            if (keys[13]) this.useItem(); keys[13] = false; //TODO STICKYKEYS
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
        screenX = Character.x - sz/2;
        screenY = Character.y - sz/2;
    }

    initialize(); 

});

