Typekit.load();
$(function(){

//TODO Consider a wrap() function that wraps things in spans or w/e


//10672-->9737
//17317-->16306 (7.6K packed)
//16306-->15861 (7528 packed)
//15861-->15803 (7507 packed)
//21549

    var kOff = { 
        ks : [],
        st : function(x) { this.ks[x]=true },
        gt : function(x) { var v = this.ks[x]; this.ks[x] = false; return v; }
    };
    var descriptors = ["cool", "decent", "lame", "noobesque"];
    //Note to self - first ones could be highest probability, etc.
    //That would stave off the probability of getting like 20 pokey things in a row
    var typedescriptions = { "[" : ["sword", "mace", "dirk", "dagger", "longsword", "axe", "stabber", "pokey thing", "pair of boots", "helmet", "legplates", "chestplate" ],
                             "!" : ["vial", "potion", "tonic"]
    };
    var finaldescriptors = { "[" : ["Truth", "bone","cats", "Power", "purity", "steel", "bronze", "iron", "Mythril", "Light", "kittenfur"],
                             "!" : ["Regeneration", "Poison", "Strength", "Constitution","Defense"] 
    };

    var keys=[], vis=[], seen=[], is=0, actionkeys = [65, 87, 68, 83, 81,69,90,67,188, 190], sz = 16, map = [], REGENRATE=25, monsters = [], items = [], tr, inventory = [], showInventory = resting = false, moves = 0, statschange = false , statpoints = 0, screenX = screenY = curlevel= 0, size, t=0, pc,B="<br/>",wielding={}, oldPosition, queue=[],usd={};

    while (t++<=255) keys[t] = false;

    $(document).keydown (
        function(e){
            t = e.which;
            console.log(t);
            keys[t]=true;
            kOff.st(t);
            gameLoop();
        }
    ).keyup (
        function(e){
            t = e.which;
            keys[t]=false;
        }
    );

    mrn = function(){return Math.random()}
    min = Math.min;
    max = Math.max;
    abs = Math.abs;
    function rnd(l, h){return l + ~~( mrn() * (h-l+1))}
    function rsp(l, h){return l + ~~( mrn() * h)}
    function intersect(a, b){ return a.x == b.x && a.y == b.y }
    function setxy(a, b){a.x = b.x;a.y = b.y}
    function dodmg(a,b){b.HP -= t=max(0,rnd(a.DMG, a.DMX+1)-b.DEF+a.STR); writeStatus(a.n + " hit" + (a.n[0]=="T"?"s":"") +  " for " + t + " damage.")} //a hits b

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
        scr.sort(function(a,b){return a[1]-b[1]});
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
            for (var x=(cr=rooms[ro]).x;x<cr.x+cr.w;++x){
                for (var y=cr.y;y<cr.y+cr.h;++y){
                    //debugger;
                    (q = rnd(0,999)) < 11 ? items.push(new Item(x,y)) :( q < 12 ? monsters.push(new Monster(x,y,l)) : 0); 
                    map[x][y] = ".";
                }
            }
        }
        for (ro in rooms){
            rooms[ro].c=true;
            for (r2 in rooms){
                var b=0;
                if (!rooms[r2].c) {
                    if (!b || abs(rooms[r2].x-rooms[ro].x)+abs(rooms[r2].y-rooms[ro].y)<
                        abs(rooms[r2].x-rooms[b].x) +abs(rooms[r2].y-rooms[b].y)){
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

            //map[tnarg.x,tnarg.y] = "P"; //DEBUG
            items.push(tnarg);
        }

        /*
        var s = ""; //DEBUG
        for (var i=0;i<size;i++){ //DEBUG
            for (var j=0;j<size;j++){//DEBUG
                s += map[i][j];//DEBUG
            }//DEBUG
            s+="<br/>";//DEBUG
        }//DEBUG

        $("#dbg").html(s); //DEBUG
        //debugger; 
        
        */
        
        seen=[];a=b=0;
        while(a++<size){seen.push([]);while(b++<size)seen[a-1].push(false);b=0}

        //seen= rng(size).map(function(){return rng(size).map(fgen(false))}); 
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
     * gameLoop()
     *
     * Takes care of most of the game logic, including odds and ends that it wasn't worth to decompose into functions.
     *
     */
    function gameLoop(){
        if (tr) { $("#c").html("Highscore"); return; }
        oldPosition = {x : Character.x, y : Character.y } ; 
        var a = false;

        //max HP = 4 * Constitution modifier + 
        //summation from 1 to character's level of (4+i)
        Character.maxHP = Character.CON*7 + 10*Character.LVL; 

         for (i in items){ items[i].N() } //TODO a little bit of code duplication here.
         for (i in inventory){ inventory[i].N() } 

        Character.HP=min(Character.HP,Character.maxHP);
        $("#hlth").html(" $: " + Character.money +B+ " LVL: " + Character.LVL +B+ " EXP: " + Character.EXP + "/" + Character.NXT +B+ "HP: " + Character.HP + "/" + Character.maxHP +B+ " DMG: " + (Character.DMG + (t=Character.STR))+  "-" + (Character.DMX +t)+ B+  " STR: " +t  +B+" CON: " + Character.CON +B+ " DEF: " + Character.DEF +B+ " Dungeon LVL:" + curlevel +B);
        if (Character.HP<0) {writeStatus("You have died. :("); end(0);}
        if (statschange) { 
            $("#board > span").html("").css("background-color","");
            writeks({"D":"efense","S":"trength","C":"onstitution"});
            t = {68:"DEF",83:"STR",67:"CON"};
            $("#1F1").html("Gain a stat: (D)efense (S)trength (C)onstitution." );
            
      
            for (x in t) if (keys[x]) {Character[t[x]]++; writeStatus(--statpoints + " points left.");}
            statschange = statpoints>0;
            return;
        } else { 

            if (Character.EXP > Character.NXT){
                Character.NXT *=2;
                Character.LVL++;
                writeStatus("<span style='color:red'>Level up! Hit L to adjust your new stats.</span>");
                statpoints++;
            }
            if (showInventory){
                $("#c").html("Inventory");
                writeks({"Enter":" Use","ESC":" close Inventory","D":"rop"});
                getInventoryKeys(); 
                writegenericlist(inventory,is);
                if (!showInventory) ssXY();
                return; //don't writeBoard
            } else {
                $("#c").html("Rogue");
                writeks({"WASD":" Move", "QEZC":" Diag", "R":"est","I":"nventory","G":"rab item", "Walk into a monster":"Attack","<br>>":" Go upstairs","<":" Go downstairs" });
                a = getKeys();
                pc=map[Character.x][Character.y]; 
                if (a || resting) { 
                    for (V in queue){
                        t=queue[V]
                        if (t.t--<0){
                            queue.splice(V, 1);
                            if (t.rel) t.v*=-1; t.rel=0;
                        }
                        if (!t.rel) Character[t.s]+=t.v;
                    }

                    resting = !(a || Character.HP == Character.maxHP) 
                    moves++;
                    Character.HP += resting + (moves%REGENRATE==0 && Character.HP != Character.maxHP)
                    if (pc == "#") {setxy(Character,oldPosition); writeStatus("You stupidly run into a rock.");} 
                    for (i in monsters) monsters[i].update(oldPosition);
                    
                    for (i in items){
                        if (intersect(Character, items[i])){
                             if (items[i].cls == "$"){
                                items[i].use();
                                items.splice(i,1); //TODO: code duplication --sorta :: BAD (maybe have an "in inventory" flag?)
                                writeStatus("You have "+Character.money+"G.");
                                break;
                             } else writeStatus(items[i].n + " rolls under your feet.");
                        }
                    }
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
            }
        }
        if (!tr) writeBoard(); 
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
        for (var i=0;i<sz;i++) { 
          for (var j=0;j<sz;j++) 
            $("#board").append("<span id='"+i+"F"+j+"'>P</span>"); 
        $("#board").append("<br>");
        } 
        setInterval(gameLoop,90);
        writeStatus("Some jerk buried the Amulet of Tnarg in this dungeon. It is your mission to get it!");

    }
    function bounded(x){
        return x>=0 && x<sz;
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

        
        for (var i=0;i<sz;i++){
            for (var j=0;j<sz;j++){
                var cs = { ".":"black", "C":"red", "j":"blue","$":"gold","[":"cyan","g":"green"}; 
                var bcs = { ".":"white", "&nbsp;":"black" }; 
                if (!vis[i][j]) if (seen[i+screenX][j+screenY]) text[i][j] = map[i+screenX][j+screenY]; else text[i][j] = "&nbsp;";
                
                if ( (t=$("#"+i+"F"+j)).html() != (s=text[i][j])) {
                    t.html(s).css({"color":cs[s] || "black","background-color":bcs[s] || "white" }); 
                }
                
                //
                if (s == ".") t.css("color",vis[i][j] ? "black" : "#cccccc");
            }
        } 

        //console.log($("#"+(ox-screenX)+"F"+(oy-screenY)).html());


        //style="background-color:black;color:red" 
        //for (i in text) html += text[i].join("") + B;

        //$("#board").html(html);
    } 
    function pickupItem(){
        if (inventory.length>15) { writeStatus("You are carrying too much!"); return;} 
        for (i in items){
            if (intersect(items[i], Character)){
                inventory.push(items[i]);
                items.splice(i, 1);
                writeStatus("You pick an item up off the ground.");
                return;
            }
        }
        writeStatus("You swing your arms hopelessly at the ground, trying to find something.");
    }

    //TODO abstract writeStatus out of all these
    var m = {//83:function(){writeStatus("You have " + Character.HP + "/" + Character.maxHP + " HP.<br> You have been playing for " + moves + " moves.")},
        71:pickupItem,
        82:function(){ 
            writeStatus("You take a quick nap."); resting = true;
        },
        73:function(){writeStatus("You take a moment to examine your inventory. Luckily, all monsters freeze in place. ");showInventory = true; kOff.gt(68)}, //TODO: THIS IS A HACK. FIX IT.
        76:function(){statschange = statpoints;},
        //87:function(){writeStatus("Nice try. Too bad life isn't that easy.");},
        188:function(){if (pc == "&lt;") { writeStatus("You descend the staircase into darker depths..."); generateLevel(++curlevel, 0);} else {writeStatus("There's no staircase here.");} },
        190:function(){if (pc == ">") { writeStatus("You ascend the staircase to safer ground."); generateLevel(--curlevel,1); } else {writeStatus("There's no staircase here.");} }
    };
    /*
     * itemuse()
     *
     * A helper function that mostly manages the inventory settings equpping, and removing consumable items from the inventory list
     */
    function itemuse(){
        var a=inventory[is];
        if (!a.equipped){
            //about to equip
            if ((a.cls=="["&&wielding[a.typ])) { writeStatus("You can't wield another item of that type."); return;}
        }
        wielding[a.typ] = !wielding[a.typ]; //This accounts not only for weapons and armor, but also for seen items (e.g. potions).
        a.equipped = !a.equipped;
        if (inventory[is].use()){
            inventory.splice(is, 1);
        }
    }
    /*
     * getInventoryKeys()
     *
     * The inventory has a special key handler. This might be abstractable; I'm not sure what the gains would be, though.
     */
    function getInventoryKeys(){
        is += keys[83] - keys[87];
        keys[83]=keys[87]=false;
        if (kOff.gt(13)) itemuse();
        if (kOff.gt(68)){
            t=inventory[is];

            if (t.cls=="[" && t.equipped){
                itemuse();
            }
            setxy(t,Character);
            items.push(t);
            inventory.splice(is, 1);
        }

        //if (kOff.gt(69)) writeStatus(inventory[is].getdetails());

        is = max(0, min ( inventory.length - 1, is));
        if (kOff.gt(27)) //(I)nventory
            {showInventory = false; kOff.ks=[];}
    }


    /*
     * getKeys()
     *
     * Moves the character and consults a dictionary lookup to run special actions on keypress.
     */
    function getKeys(){
        Character.x += max(-1, min(1, -keys[69] - keys[81] +keys[90] + keys[67] + keys[83] - keys[87]));
        Character.y += max(-1, min(1, keys[68] - keys[65] - keys[81] + keys[69] - keys[90] + keys[67]));
        for (i in m) if (kOff.gt(i)) m[i]();

        var change = false;
        for (i in actionkeys) change |= keys[actionkeys[i]],keys[actionkeys[i]]=0; 
        
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
        t[0]=="C"? ns.s="CON":0;
        t[0]=="D"? ns.s="DEF":0;

        Character[ns.s] += ns.v; //First use for relative buffs (like regen) and ONLY use for nonrelative buffs (+1 STR etc)
        queue.push(ns);
    }

    var tnarg = {x:-1,y:-1,ists:true,cls:"*",n:"The Talisman of Tnarg"}; 
    function Item(x, y){
        this.x=x;
        this.y=y;
        this.cls = "";
        this.equipped = false;
        this.spec = {}; 
        this.N=function(){
            this.n= this.cls=="!"? "A potion of " + (this.typ in wielding ? this.typ : "mystery" ) : this.n;
        } 
        this.n = "";
        this.typ="";
        this.d="";
        this.init = function() { 
            with(this){      
                t = cls = "!"; //relem(["!", "[", "$", "?"]) //FIXME

                if (t == "$"){
                    spec["money"] = -rnd(curlevel, (1+curlevel)*7);
                }
                if (t == "?"){
                    n = "unidentified scroll";
                    //TODO: once you use it once, you know what it does.
                }

                var d2;
                if (t== "["){
                    //x to y damage
                    //+N to strength
                    d2=rnd(0,typedescriptions["["].length-1);
                    d = typedescriptions[t][d2];
                    if (d2<8){ 
                        spec["DMX"] = (spec["DMG"]= rnd(2*curlevel, 6*curlevel)) + rnd(1,5+curlevel*2);
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
                n = "A " + n;

            }
        }
        this.use = function() {
            var s=this.spec,c=this.cls, fb="You feel better.";
            if (c=="?"){
                writeStatus("You read the scroll.");
                showInventory = false;
                //for now, just teleport.
                var r=rnd(0,100);
                console.log(r);
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
                    Character.EXP+=10)
                :  (writeStatus("Nothing happens."))
            } else {
                if (this.equipped) { 
                    for (x in s) Character[x] += s[x] != null ? s[x] : 0;
                    if (c=="!") {
                        //Potion types: ["Regeneration", "Poison", "Strength", "Constitution","Defense"]
                        effect(t=this.typ);

                        writeStatus("The potion tastes like " + t + "!"); //Heheheh 
                        //queue.push({t:15,rel:0,s:"HP",v:-1,n:"poison"});
                    }
                    if (c=="[") writeStatus("You wield the object. You can't wait to pwn some noobs.");
                } else { 
                    for (x in s) Character[x] -= s[x] != null ? s[x] : 0;
                    if (c=="[") writeStatus("You unwield the object.");
                }
            }
            return (c == "$" || c == "!" || c=="?"); //destroy
        }
        this.init(); 
    }

    //follow: 0 = never. 1 = after attacked. 2 = always, 3 = never moves...
    //if not defined ignore them (flock)
    //lvl = min level to encounter on

    /*
     * Store monster properties in a bar delimited string.
     *
     * Character|Full name|Minimum level to encounter|Damage (low)|Damage (high)|Hit points|Follow flag|Agility
     *
     * Special notes about AGL: AGL determines how fast a monster can move compared to you. 5 means just as fast. 0 means never moves. 9 means doublespeed, almost.
     */
    ms = ["C|cobol|1|5|3|14|0|3",
          "r|rat|1|2|3|8|1|4",
          "g|goblin|1|3|4|16|1|1",
          "j|jerk|2|2|6|9|1|2",
          "s|slime|3|6|12|20|3"
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
                if (this.HP < 0){ 
                    writeStatus("Holy crap! "+this.n+" explodes in a huge explosion of blood! It's really gross!");
                    Character.EXP += ~~Math.sqrt(this.maxHP*this.DMG/9)+1;
                    if (rnd(0,5) <2) { items.push(new Item(this.x, this.y)); writeStatus("The monster dropped an item.")}
                    for (i in monsters) if (monsters[i] == this) monsters.splice(i, 1);
                }

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

    generateLevel(1,0);
    ssXY();
    initialize(); 

});

