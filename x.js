$(document).ready(function(){

//10672-->9737
//17317-->16306 (7.6K packed)
//16306-->15861 (7528 packed)
//15861-->15803 (7507 packed)

    var kOff = { 
        ks : [],
        st : function(x) { this.ks[x]=true },
        gt : function(x) { var v = this.ks[x]; this.ks[x] = false; return v; }
    };
    var descriptors = ["awesome", "cool", "decent", "lame", "noobesque", "Epic", "Cursed", ""];
    //Note to self - first ones could be highest probability, etc.
    //That would stave off the probability of getting like 20 pokey things in a row
    var typedescriptions = { "w" : ["sword", "mace", "dirk", "dagger", "longsword", "axe", "stabber", "long pokey thing"],
                             "p" : ["vial", "potion", "tonic"],
                             "a" : ["chestplate", "helmet", "legplate", "pair of boots"] //Further note to self. Only one of these may be equipped at a time.
    };
    var finaldescriptors = { "w" : ["of Glory", "of Truth", "of bone", "made out of cats", "of Light", "of Power", "of purity", "of steel", "of bronze", "of iron"],
                             "p" : ["of Healing"], //uhm... h..m...
                             "a" : ["of iron", "of steel", "of bone", "of Mythril", "of Light", "of kittenfur"] //If your weapon and armor match up, cool stuff happen(zorz)
    };

    var keys=[], seen=[], stairup = stairdown = {x:0, y:0}, actionkeys = [65, 87, 68, 83, 80], dx = [1,0,-1,0,1,1,-1,-1],dy = [0,1,0,-1,1,-1,1,-1], sz = 16, map = [], REGENRATE=25, monsters = [], items = [], inventory = [], showInventory = snark = resting = false, moves = money = 0, statschange = false , statpoints = 15, screenX = screenY = curlevel= 0, size, t;

    for (t=0;t<=255;t++) keys[t] = false;

    $(document).keydown (
        function(e){
            console.log(e.which);
            keys[e.which]=true;
        }
    );
    $(document).keyup (
        function(e){
            t = e.which;
            keys[t]=false;
            kOff.st(t);
        }
    );

    function fgen(r,a){return (function(a){return eval(r);})} //My masterpiece  

    function re(x) {return eval(x)} 
    function rng(x) {if(!x)return[0];var zQ=rng(x-1);zQ.push(x-1);return zQ;} //Here we go...
    function rnd(l, h){ return l + Math.floor( Math.random() * (h-l))}
    function rsp(l, h){ return l + Math.floor( Math.random() * (h))}
    function intersect(a, b){ return a.x == b.x && a.y == b.y }
    function max(x,y){return x>y?x:y}
    function min(x,y){return x>y?y:x}
    function abs(x){return x>0?x:-x}
    function pdbg(x){$("#debugger").html($("#debugger").html() + "<br/>" + x)}
    function setxy(a, b){a.x = b.x;a.y = b.y}
    function dodmg(a){return rnd(a.DMG, a.DMX+1)}

    function generateLevel(l){
        curlevel = l;
        size = 25* rsp(2,min(l/2+1,16));//TODO: consider boundaries harder

        var dungeon = [], roomn = rsp(7*size/40, 13*size/40),rooms = [], mitems = [] ,mmonsters = [],loops = 0; //WRONG, used for debugging only

         for (t=0;t<size;t++){
            dungeon.push(rng(size).map(function(){return "#"}));
        } 
        for (var i=0;i<roomn;i++){
            var newr = {w: rnd(10,15)};
            newr.h = newr.w;
            var good = false;
            while (!good){
                if (++loops>roomn*8) break; //TODO: this puts a theoretical limit at 100 rooms?
                good = true;
                newr.x = rnd(1,size - newr.w);
                newr.y = rnd(1,size - newr.h);
                for (j in rooms) if (abs(newr.x - rooms[j].x) < 10 && abs(newr.y - rooms[j].y) < 10) {good = false; break;}
            }
            good && rooms.push(newr);
        }

        var upplace = rnd(0,roomn-1);
        var downplace = rnd(0,roomn-1); while(downplace == upplace) downplace = rnd(0,roomn-1);
        for (i in rooms){
            for (var j=0;j<rooms[i].w;j++){ 
                for (var k=0;k<rooms[i].h;k++){ 
                    var tx = rooms[i].x + j, ty = rooms[i].y + k;
                    if (tx >= size || ty >= size) continue;
                    if (rnd(0,800) < 4) mitems.push(new Item(tx, ty)) 
                    if (rnd(0,400) < 2) mmonsters.push(new Monster(tx, ty, l)) 
                    dungeon[tx][ty] = ".";
                }
            }
            if (i==upplace) dungeon[rooms[i].x+3][rooms[i].y+3] = ">";
            if (i==downplace) dungeon[rooms[i].x+3][rooms[i].y+3] = "<";
        }
        var connectedrooms = [rooms[0]];
        //create a minimum spanning tree of dungeon rooms (LOL) 
        while (rooms.length > 0) { 
            //find closest room to rooms already connected
            var ldi = size*3;
            var start = stop = -1;
            //we say we have already considered the first i rooms
            for (j in connectedrooms){ 
                for (k in rooms){
                    var dist = abs(connectedrooms[j].x - rooms[k].x) + abs(connectedrooms[j].y - rooms[k].y) ;
                    if (dist < ldi){
                        ldi = dist;
                        start = j;
                        stop = k;
                    }
                }
            }
            //connect connectedrooms[start] to rooms[stop]
            var s={}; setxy(s, connectedrooms[start]);
            var e={}; setxy(e, rooms[stop]);

            for(x in s)s[x]=min(s[x],size-1);
            for(x in e)e[x]=min(e[x],size-1);

            while (s.x != e.x){ s.x += (s.x>e.x)?-1:1; dungeon[s.x][s.y] = "."}
            while (s.y != e.y){ s.y += (s.y>e.y)?-1:1; dungeon[s.x][s.y] = "."} //:)

            connectedrooms.push(rooms.splice(stop, 1)[0]);
        }


        //$("#debugger").html(dungeon.join("<br\>"));
        //pad the dungeon by md chars
        var md=8; 
        size += md*2;
        var fdungeon = []; 
        for (var i=0;i<size;i++){ 
            fdungeon.push([""]); 
            for (j=0;j<size;j++){ 
                if (i-md>0 && j-md>0 && i < size-md && j < size-md) fdungeon[i] += dungeon[i-md][j-md]; else fdungeon[i] += "#";
            }
        }
        for (t=0;t<size;t++){
            seen.push(rng(size).map(function(){return false;})); //conflates with the previous dungeon creatoin loop
        } 
        for (x in mitems) { mitems[x].x +=md; mitems[x].y +=md;}
        for (x in mmonsters) { mmonsters[x].x +=md; mmonsters[x].y +=md;}
        items = mitems;//todo remove these in a clever way.
        monsters = mmonsters;

        map = fdungeon;

        setxy(Character,{x:connectedrooms[0].x+md,y:connectedrooms[0].y+md});
    }

    var gameLoop = function(){
        var oldPosition = {x : Character.x, y : Character.y } ; 
        var a = false;

        if (statschange) { 
            t = {65:"AGL",83:"STR",67:"CON",69:"DEF"};
            $("#board").html("Adjust your stats: Press the button in () to change. <br/>" + 
                    "(A/a)gility :" + Character.AGL + "<br/>" + 
                    "(S/s)trength:" + Character.STR + "<br/>" + 
                    "(D/d)efense:" + Character.DEF + "<br/>" + 
                    "(C/c)onstitution:" + Character.CON + "<br/>" + "");

            clearStatus();
            writeStatus( statpoints + " points left.");
            for (x in t) if (keys[x]) Character[t[x]]++, statpoints--;
            if (statpoints <= 0 ){statschange = false; writeBoard(); } 
            return;
        }
        Character.updatechar();

        if (showInventory){
            getInventoryKeys(); 
            Inventory.write();
            if (!showInventory) writeBoard();
        } else {
            a = getKeys();
            if (a || resting) { 
                resting = !(a || Character.HP == Character.maxHP) 
                moves++;
                Character.HP += resting + (moves%REGENRATE==0 && Character.HP != Character.maxHP)
                for (i in monsters) monsters[i].update(oldPosition);
                
                for (i in items){
                    if (intersect(Character, items[i])){
                         if (items[i].cls == "$"){
                            writeStatus("You pick up some cash off the ground. Sweet.");
                            money += items[i].spec["amt"];
                            items.splice(i, 1); break;
                         } else writeStatus("A " + items[i].getname() + " rolls under your feet.");
                    }
                }
                if (map[Character.x][Character.y] == ">") writeStatus("You see stairs leading downward.");
                if (map[Character.x][Character.y] == "#") {setxy(Character,oldPosition); writeStatus("You stupidly run into a rock.");} 
                screenX = min( max(0, Character.x - sz/2), size - sz );
                screenY = min( max(0, Character.y - sz/2), size - sz);
                writeBoard();
            }
        }
        writeGeneric();
    }

    function writeGeneric(){
        $("#hlth").html("<b>HP: " + Character.HP + "/" + Character.maxHP + " LVL: " + Character.LVL + " $: " + money + " DMG: " + Character.DMG + "-" + Character.DMX +  "<br/>"+ " EXP: " + Character.EXP + "/" + Character.NXT + " STR: " + Character.STR + " DEF: " + Character.DEF + " CON: " + Character.CON + " AGL: " + Character.AGL + "</b>");
    }


    function writeStatus(status){
        //bold top status
        var ar = $("#status").html().split(">");
        ar.splice(0,0, status + "<br/>"); 
        ar = ar.slice(0,4);
        $("#status").html( ar.join(">") );
    }
    function clearStatus(){ $("#status").html(""); } 

    function initialize(){
        setInterval(gameLoop,90);
        writeBoard();
    }
    function bound(x){
        return min ( max(x, 0) , sz) ;
    }
    function bounded(x){
        return x>=0 && x<sz;
    }

    function writeBoard(){
        var text = [];
        var vis = [];
        var html = "";

        for (var i=0;i<sz;i++) { 
            text.push([]); 
            vis.push([]);
            for (var j=0;j<sz;j++) vis[i].push(" "),text[i].push(map[i+screenX][j+screenY]);
            
        }  

        for (i in items) if(bounded(items[i].x - screenX) && bounded(items[i].y - screenY)) text[items[i].x - screenX][items[i].y - screenY] = items[i].cls;

        for (i in monsters) if(bounded(monsters[i].x - screenX) && bounded(monsters[i].y - screenY)) text[monsters[i].x - screenX][monsters[i].y - screenY] = monsters[i].rep;

        text[Character.x - screenX][Character.y - screenY] = Character.rep;

        //Mark visibility
        var x0=Character.x - screenX, y0 = Character.y - screenY;
        var rad=6;

        for (var i=x0-rad;i<=x0+rad;i++){
            for (var j=x0-rad;j<=x0+rad;j++){
                if (Math.round( Math.sqrt( (i-x0)*(i-x0) +(j-y0)*(j-y0))) == rad){
                    //draw line from (x0,y0) to (i,j)
                    var nx,ny;
                    for (var d=0;d<100;d++){
                        nx=Math.floor( d * (i-x0)/100)+x0, ny = Math.floor(d * (j-y0)/100)+y0;
                        if (nx>16||ny>16) continue;
                        vis[nx][ny] = "x";
                        seen[nx+screenX][ny+screenY] = true;
                        if (text[nx][ny] == "#") break;
                    }
                }
            }
        }
        
        for (var i=0;i<sz;i++){
            for (var j=0;j<sz;j++){
                if (vis[i][j] != "x"){ 
                    if (seen[i+screenX][j+screenY]) text[i][j] = map[i+screenX][j+screenY] ;else text[i][j] = "&nbsp;";
                }
            }
        } 

        for (i in text) html += text[i].join("") + "<br/>";

        $("#board").html(html);
    }



    function pickupItem(){
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

    var m = {//83:function(){writeStatus("You have " + Character.HP + "/" + Character.maxHP + " HP.<br> You have been playing for " + moves + " moves.")},
        80:pickupItem,
        82:function(){writeStatus("You take a quick nap."); resting = true;},
        73:function(){writeStatus("You take a moment to examine your inventory. Luckily, all monsters freeze in place. (E)xamine. Enter to use.");showInventory = true;},
        72:function(){if(snark)writeStatus("Fine then. (S)tatus (H)elp (I)nventory (R)est (P)ick-up Insta(W)in");else writeStatus("What, you don't know how to play a roguelike?"); snark = true;},
        //87:function(){writeStatus("Nice try. Too bad life isn't that easy.");},
        190:function(){if (map[Character.x][Character.y] == ">") { writeStatus("You descend the staircase into darker depths..."); generateLevel(curlevel++); writeBoard();} else {writeStatus("There's no staircase here.");} },
        188:function(){if (map[Character.x][Character.y] == "<") { writeStatus("You ascend the staircase to safer ground."); generateLevel(curlevel--); writeBoard();} else {writeStatus("There's no staircase here.");} }
    };
    function itemuse(){
        inventory[Inventory.sel].equipped = !inventory[Inventory.sel].equipped;
        if (inventory[Inventory.sel].use()){
            inventory.splice(Inventory.sel, 1);
        }
    }
    function getInventoryKeys(){
        Inventory.sel += keys[83] - keys[87];
        if (kOff.gt(13)) itemuse();
        if (kOff.gt(69)) writeStatus(inventory[Inventory.sel].getdetails());

        Inventory.sel = max(0, min ( inventory.length - 1, Inventory.sel));
        if (kOff.gt(73)) //(I)nventory
            showInventory = false;
    }


    function getKeys(){
        Character.x += keys[83] - keys[87];
        Character.y += keys[68] - keys[65];

        for (i in m) if (kOff.gt(i)) m[i]();

        var change = false;
        for (i in actionkeys){
            change |= keys[actionkeys[i]]; 
        }
        return change;
    }


    function Item(x, y){
        this.x=x;
        this.y=y;
        this.cls = "";
        this.identified = false;
        this.equipped = false;
        this.spec = {}; 
        this.n = "";
        this.details = "";
        this.getdetails = function(){
            if (!this.identified) return "This item has not been identified.";
            return this.details;
        }
        this.getname = function() { 
            if (this.cls in typedescriptions){
                return !this.n ? (this.n= (this.identified ? descriptors[rnd(0, descriptors.length)] : "mysterious ") + " " +  
                        typedescriptions[this.cls][rnd(0, typedescriptions[this.cls].length)] + " " +  
                        (this.identified ? finaldescriptors[this.cls][rnd(0, finaldescriptors[this.cls].length)] : "")) : this.n  ; 
            }
        }
        this.init = function() { 
            if (Math.random() > .5) this.identified = true;
            
            t = this.cls = ["w", "p", "a", "$"][rnd(0,4)]; 

            if (t == "$"){
                this.spec["amt"] = rnd(curlevel, (1+curlevel)*7);
            }

            if (t== "w"){
                //x to y damage
                //+N to strength

                this.spec["DMG"] = rnd(1+curlevel, 2*curlevel+4);
                this.spec["DMX"] = this.spec["DMG"] + rnd(1,2+3*(1+curlevel));
                this.details += "Deals " + this.spec["DMG"] + "-" + this.spec["DMX"] + " damage.";
                if(max(0,rnd(0,100)-95)) {this.spec["STR"] = rnd(1,5); this.details += "<br/> +" + this.spec["STR"] + "STR";}

            }
            if (t== "p"){
                this.spec["HP"] = rnd( curlevel*2+1, (curlevel+3)*6);
                this.details += "Restores " + this.spec["HP"] + " HP.";
            }
        }
        this.use = function() {
            var s=this.spec,c=this.cls;
            if (this.equipped) { 
                for (x in s) Character[x] += s[x] != null ? s[x] : 0;
                if (c=="p") writeStatus("You drink the potion. Yummy! +" + s["HP"] + "HP");
                if (c=="w") writeStatus("You wield the weapon. You can't wait to pwn some noobs.");
            } else { 
                for (x in s) Character[x] -= s[x] != null ? s[x] : 0;
                if (c=="w") writeStatus("You unwield the weapon. Time for good old fisticuffs.");
            }

            return (c=="p"); //destroy
        }
        this.init(); 
    }

    //follow: 0 = never. 1 = after attacked. 2 = always
    //if not defined ignore them (flock)
    //lvl = min level to encounter on
    ms = { 0: {rep : "C", nm : "Cobol", lvl: 1, DMG:"", DMX:"", HP:"", follow:1,flock:0},
           1: {rep : "j", nm : "Jerk", lvl: 1, DMG:"", DMX:"", HP:"", follow:2,flock:0}
    };
    var MNS=2;


    function Monster(x, y, l) { 
        do this.z=rsp(0,MNS); while(ms[this.z].lvl>l) 
        this.rep = ms[this.z].rep; 
        this.x = x;
        this.y = y;
        this.STR = rnd(l+1,l*2+1) ;
        this.DMG = rnd(l+1, l*2);
        this.DMX = rsp(this.DMG+1, this.DMG*2);
        this.AGL = 3;
        this.hsh = rnd(0,999999);
        this.maxHP = this.HP = (rnd(l*3, l*9)) ;
        this.follow = ms[this.z].follow == 2;
        this.update = function(oldPosition) {
            if (intersect(this, Character)) {
                //CHECK DEATH (both) -- maybe do that later...
                var d = dodmg(Character);
                this.HP -= d;
                writeStatus("You deal " + d + " damage");
                if (this.HP > 0 || this.AGL > Character.AGL){
                    Character.HP -= dodmg(this);
                    writeStatus("Holy crap! The " + ms[this.z].nm + " hits you!");
                }
                if (this.HP < 0){ 
                    writeStatus("Holy crap! The monster explodes in a huge explosion of blood! It's really gross!");
                    Character.EXP += Math.floor(this.STR * this.maxHP / 12);
                    if (rnd(0,5) <2) { items.push(new Item(this.x, this.y)); writeStatus("The monster dropped an item.")}

                    for (i in monsters) if (monsters[i] == this) monsters.splice(i, 1);
                }

                setxy(Character, oldPosition);
            } else { 
                var dir = rnd(0,8);
                var op = {x : this.x, y: this.y} ; 

                if (this.follow){ 
                    this.x != Character.x ? ( this.x>Character.x? this.x--: this.x++):0;
                    this.y != Character.y ? ( this.y>Character.y? this.y--: this.y++):0;
                } else { 
                    this.x += dx[dir];
                    this.y += dy[dir];
                }
                for (x in monsters) if (this.hsh!=monsters[x].hsh && intersect(this,monsters[x])) setxy(this, op);
                if (map[this.x][this.y] == "#") setxy(this, op) 
                if (intersect(this, Character)) {
                    Character.HP -= dodmg(this);
                    writeStatus("Holy crap! That looked painful!");
                    setxy(this, op) 
                }
            }
        }; 
    }; 

    var Character = { 
        x : 5,
        y : 8,
        HP : 100,
        maxHP : 100,
        rep : "@",
        DMG : 2, 
        DMX : 5, 
        AGL : 4,
        EXP : 0,
        NXT : 50,
        CON : 10,
        STR : 4,
        DEF : 4,
        LVL : 1,
        updatechar : function() { 
            (this.HP == this.maxHP) ? this.rep = "@" : this.rep = (this.HP / this.maxHP).toString()[2]; //Possible bug when YOU ARE DEAD
        }
    };


    var Inventory = { 
        sel : 0,
        write : function () {
            var inv = ""; 
            for (i in inventory) inv += (this.sel==i ? "*" : "-")+ inventory[i].getname() + (inventory[i].equipped ? "[equipped]" : "") +  "<br/>";
            
            if (!inventory.length) inv = "Dust. <br/>"
            for (var i=0;i<max(sz - inventory.length , 0);i++) inv += "- <br/>" 

            $("#board").html(inv);
        }

    };

    generateLevel(1);
    screenX = min( max(0, Character.x - sz/2), size - sz );
    screenY = min( max(0, Character.y - sz/2), size - sz);
    initialize(); 

});

