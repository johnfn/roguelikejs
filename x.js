$(document).ready(function(){

//10672-->9737
//17317-->16306 (7.6K packed)
//16306-->15861 (7528 packed)
//15861-->15803 (7507 packed)

    var descriptors = ["awesome", "cool", "decent", "lame", "noobesque", "Epic", "Cursed", ""];
    //Note to self - first ones could be highest probability, etc.
    //That would stave off the probability of getting like 20 pokey things in a row
    var typedescriptions = { "w" : ["sword", "mace", "dirk", "dagger", "longsword", "axe", "stabber", "long pokey thing"],
                             "p" : ["vial", "potion", "tonic"],
                             "a" : ["chestplate", "helmet", "legplate", "pair of boots"] , //Further note to self. Only one of these may be equipped at a time.
    };
    var finaldescriptors = { "w" : ["of Glory", "of Truth", "of bone", "made out of cats", "of Light", "of Power", "of purity", "of steel", "of bronze", "of iron"],
                             "p" : ["of Healing"], //uhm... h..m...
                             "a" : ["of iron", "of steel", "of bone", "of Mythril", "of Light", "of kittenfur"] //If your weapon and armor match up, cool stuff happen(zorz)
    };

    var keys = []; for (var i=0;i<=255;i++) keys[i] = false;
    var offkeys = [];


    var actionkeys = [37, 38, 39, 40, 80]; //note to self, use WASD eventually hur 80--pickup
    var dx = [1,0,-1,0,1,1,-1,-1];
    var dy = [0,1,0,-1,1,-1,1,-1];
    var sz = 10;
    var REGENRATE=25;
    var monsters = [];
    var items = [];
    var inventory = [];
    var showInventory = snark = false;
    var moves = money = 0;
    var statschange = false; //true;
    var statpoints = 15;
    var scrn = {x:0, y:0};
    var screenX = screenY = curlevel= 0;
    var resting = false;
    var t;

    
    $(document).keydown (
        function(event){
            console.log(event.which);
            keys[event.which]=true;
        }
    );
    $(document).keyup (
        function(event){
            t = event.which;
            keys[t]=false;
            offkeys[t]=true;
        }
    );

    function rnd(l, h){ return l + Math.floor( Math.random() * (h-l));}
    function intersect(a, b){ return a.x == b.x && a.y == b.y; }
    function max(x,y){return x>y?x:y}
    function min(x,y){return x>y?y:x}
    function abs(x){return x>0?x:-x}
    function pdbg(x){$("#debugger").html($("#debugger").html() + "<br/>" + x)}
    function setxy(a, b){a.x = b.x;a.y = b.y;}
    function dodmg(a){return rnd(a.STR, a.DMX)}

    function generateLevel(l){
        var size = 100;
        var dungeon = [];

         for (t=0;t<size;t++){
            dungeon.push([]);
            for (var j=0;j<size;j++){
                dungeon[t].push("#");
            }
        } 
        var roomn = 16;//rnd(15, 35);
        var rooms = [];
        var mitems = [];
        var mmonsters = [];
        var loops = 0; //WRONG, used for debugging only
        for (var i=0;i<roomn;i++){
            var newr = {w: rnd(10,15)};
            newr.h = newr.w;
            var good = false;
            while (!good){
                if (++loops>100) break; //give up!
                good = true;
                newr.x = rnd(0,size - newr.w);
                newr.y = rnd(0,size - newr.h);
                for (j in rooms) if (abs(newr.x - rooms[j].x) < 10 && abs(newr.y - rooms[j].y) < 10) {good = false; break;}
            }
            rooms.push(newr);
        }

        for (i in rooms){
            for (var j=0;j<rooms[i].w;j++){ 
                for (var k=0;k<rooms[i].h;k++){ 
                    var tx = rooms[i].x + j, ty = rooms[i].y + k;
                    if (tx >= size || ty >= size) continue;
                    if (rnd(0,800) <19) { mitems.push(new Item(tx, ty)) } 
                    if (rnd(0,400) < 2) { mmonsters.push(new Monster(tx, ty, l)) } 
                    dungeon[tx][ty] = ".";
                }
            }
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

            for(x in s)s[x]=min(s[x],99);
            for(x in e)e[x]=min(e[x],99);

            while (s.x != e.x){ s.x += (s.x>e.x)?-1:1 ; dungeon[s.x][s.y] = ".";}
            while (s.y != e.y){ s.y += (s.y>e.y)?-1:1 ; dungeon[s.x][s.y] = ".";} //:)

            connectedrooms.push(rooms.splice(stop, 1)[0]);
        }


        return {"map": dungeon, "startr" : connectedrooms[0], "items" : mitems, "monsters": mmonsters};
        //$("#debugger").html(dungeon.join("<br\>"));

        //choose random rooms to place > and < 

        //place items

        //write the rooms into the dungeon
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
                resting = !(a || Character.health == Character.maxhealth) 
                moves++;
                Character.health += resting + (moves%REGENRATE==0 && Character.health != Character.maxhealth)
                for (i in monsters) monsters[i].update(oldPosition);
                
                for (i in items){
                    if (intersect(Character, items[i])){
                         if (items[i].cls == "$"){
                            writeStatus("You pick up some cash off the ground. Sweet.");
                            money += items[i].spec["amt"];
                            items.splice(i, 1); break;
                         } else {
                             writeStatus("A " + items[i].getname() + " rolls under your feet.");
                         }
                    }
                }
                if (map[Character.x][Character.y] == "#") {setxy(Character,oldPosition); writeStatus("You stupidly run into a rock.");} 
                screenX = max(0, Character.x - sz/2);
                screenY = max(0, Character.y - sz/2);
                writeBoard();
            }
        }
        writeGeneric();
    }

    function writeGeneric(){
        $("#hlth").html("<b>HP: " + Character.health + "/" + Character.maxhealth + " LVL: " + Character.LVL + " $: " + money + " DMG: " + Character.DMG + "-" + Character.DMX +  "<br/>"+ " EXP: " + Character.EXP + "/" + Character.NXT + " STR: " + Character.STR + " DEF: " + Character.DEF + " CON: " + Character.CON + " AGL: " + Character.AGL + "</b>");
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
        var html = "";

        for (var i=0;i<sz;i++) { 
            text.push([]); 
            for (var j=0;j<sz;j++) { 
                text[i].push(map[i+screenX][j+screenY]);
            } 
        }  

        for (i in items) if(bounded(items[i].x - screenX) && bounded(items[i].y - screenY)) text[items[i].x - screenX][items[i].y - screenY] = items[i].cls;

        for (i in monsters) if(bounded(monsters[i].x - screenX) && bounded(monsters[i].y - screenY)) text[monsters[i].x - screenX][monsters[i].y - screenY] = monsters[i].rep;

        text[Character.x - screenX][Character.y - screenY] = Character.rep;

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

    var m = {83:function(){writeStatus("You have " + Character.health + "/" + Character.maxhealth + " health.<br> You have been playing for " + moves + " moves.")},
        80:pickupItem,
        82:function(){writeStatus("You take a quick nap."); resting = true;},
        73:function(){writeStatus("You take a moment to examine your inventory. Luckily, all monsters freeze in place. (E)xamine. E(Q)uip. Enter to use.");showInventory = true;},
        72:function(){if(snark)writeStatus("Fine then. (S)tatus (H)elp (I)nventory (R)est (P)ick-up Insta(W)in");else writeStatus("What, you don't know how to play a roguelike?"); snark = true;},
        87:function(){writeStatus("Nice try. Too bad life isn't that easy.");},
    };
    function itemuse(){
        inventory[Inventory.sel].equipped = !inventory[Inventory.sel].equipped;
        if (inventory[Inventory.sel].use()){
            inventory.splice(Inventory.sel, 1);
        }
    }
    function getInventoryKeys(){
        Inventory.sel += keys[40] - keys[38];
        if (keys[13]) itemuse();
        if (keys[69]) writeStatus(inventory[Inventory.sel].getdetails());
        if (keys[81]) itemuse(); 


        Inventory.sel = max(0, min ( inventory.length - 1, Inventory.sel));
        if (keys[73]) //(I)nventory
            showInventory = false;
    }


    function getKeys(){
        Character.x += keys[40] - keys[38];
        Character.y += keys[39] - keys[37];

        for (i in m) if (keys[i]) m[i]();

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
                return this.n==""? (this.n= (this.identified ? descriptors[rnd(0, descriptors.length)] : "mysterious ") + " " +  
                        typedescriptions[this.cls][rnd(0, typedescriptions[this.cls].length)] + " " +  
                        (this.identified ? finaldescriptors[this.cls][rnd(0, finaldescriptors[this.cls].length)] : "")) : this.n  ; 
            }
        }
        this.init = function() { 
            if (Math.random() > .5) this.identified = true;
            
            this.cls = ["w", "p", "a", "$",][rnd(0,4)]; 

            if (this.cls == "$"){
                this.spec["amt"] = rnd(curlevel, (1+curlevel)*7);
                return;
            }

            if (this.cls == "w"){
                //x to y damage
                //+N to strength

                this.spec["DMG"] = rnd(1+curlevel, 2*curlevel+4);
                this.spec["DMX"] = this.spec["DMG"] + rnd(1,2+3*(1+curlevel));
                this.details += "Deals " + this.spec["DMG"] + "-" + this.spec["DMX"] + " damage.";
                if(max(0,rnd(0,100)-95)) {this.spec["STR"] = rnd(1,5); this.details += "<br/> +" + this.spec["STR"] + "STR";}

            }
            if (this.cls == "p"){
                this.spec["HP"] = rnd( curlevel*2+1, (curlevel+3)*6);
                this.details += "Restores " + this.spec["HP"] + " HP.";
            }
        }
        this.use = function() {
            var r;
            if (this.equipped) { 
                Character.health += this.spec["HP"] != null ? this.spec["HP"] : 0;
                Character.DMG += this.spec["DMG"] != null ? this.spec["DMG"] : 0;
                Character.DMX += this.spec["DMX"] != null ? this.spec["DMX"] : 0;
                Character.health > Character.maxhealth ? Character.health = Character.maxhealth : 0;

                if (this.cls=="p") writeStatus("You drink the potion. Yummy! +" + this.spec["HP"] + "HP");
                if (this.cls=="w") writeStatus("You wield the weapon. You can't wait to pwn some noobs.");
            } else { 
                Character.DMG -= this.spec["DMG"] != null ? this.spec["DMG"] : 0;
                Character.DMX -= this.spec["DMX"] != null ? this.spec["DMX"] : 0;
                if (this.cls=="w") writeStatus("You unwield the weapon. Time for good old fisticuffs.");
            }

            return (this.cls =="p"); //destroy
        }
        this.init(); 
    }


    function Monster(x, y, l) { 
        this.rep = "M";
        this.seeking = false;
        this.x = x;
        this.y = y;
        this.STR = rnd(l+1,l*2+1) ;
        this.DMX = 3;
        this.AGL = 3;
        this.health = 5*(rnd(l+1, l*3)) ;
        this.maxhealth = this.health;
        this.update = function(oldPosition) {
            if (intersect(this, Character)) {
                //CHECK DEATH (both) -- maybe do that later...
                var d = dodmg(Character);
                this.health -= d;
                writeStatus("You deal " + d + " damage");
                if (this.health > 0 || this.AGL > Character.AGL){
                    Character.health -= dodmg(this);
                    writeStatus("Holy crap! That looked painful!");
                }
                if (this.health < 0){ 
                    writeStatus("Holy crap! The monster explodes in a huge explosion of blood! It's really gross!");
                    Character.EXP += Math.floor(this.STR * this.maxhealth / 12);
                    for (i in monsters) if (monsters[i] == this) monsters.splice(i, 1);
                }

                setxy(Character, oldPosition);
            } else { 
                var dir = rnd(0,8);
                var op = {x : this.x, y: this.y} ; 

                this.x += dx[dir];
                this.y += dy[dir];
                if (map[this.x][this.y] == "#") setxy(this, op) 
            }
        }; 
    }; 

    var Character = { 
        x : 5,
        y : 8,
        health : 100,
        maxhealth : 100,
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
            (this.health == this.maxhealth) ? this.rep = "@" : this.rep = (this.health / this.maxhealth).toString()[2]; //Possible bug when YOU ARE DEAD
        },
    };


    var Inventory = { 
        sel : 0,
        write : function () {
            var inv = ""; 
            for (i in inventory){
                inv += (this.sel==i ? "*" : "-") +  "1x " + inventory[i].getname() + (inventory[i].equipped ? "[equipped]" : "") +  "<br />";
            }
            if (inventory.length == 0) inv = "Dust. <br />"
            for (var i=0;i<max(sz - inventory.length , 0);i++) inv += "- <br />" 

            $("#board").html(inv);
        }, 

    };

    var curleveldata = generateLevel(1);

    items = curleveldata["items"];
    monsters = curleveldata["monsters"];
    var map = curleveldata["map"];

    setxy(Character,curleveldata["startr"]);
    screenX = max(0, Character.x - sz/2);
    screenY = max(0, Character.y - sz/2);
    console.log(screenX, screenY);
    initialize(); 

});

