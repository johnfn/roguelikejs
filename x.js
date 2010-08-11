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
    var descriptors = ["cool", "decent", "lame", "noobesque", "Cursed"];
    //Note to self - first ones could be highest probability, etc.
    //That would stave off the probability of getting like 20 pokey things in a row
    var typedescriptions = { "e" : ["sword", "mace", "dirk", "dagger", "longsword", "axe", "stabber", "long pokey thing", "pair of boots", "helmet", "legplates", "chestplate" ],
                             "p" : ["vial", "potion", "tonic"]
    };
    var finaldescriptors = { "e" : ["of Truth", "of bone","made out of cats", "of Power", "of purity", "of steel", "of bronze", "of iron","of Mythril", "of Light", "of kittenfur"],
                             "p" : ["of Healing"] //uhm... h..m...
    };

    var keys=[], vis=[], seen=[], actionkeys = [65, 87, 68, 83, 188, 190], sz = 16, map = [], REGENRATE=25, monsters = [], items = [], inventory = [], showInventory = resting = false, moves = 0, statschange = false , statpoints = 0, screenX = screenY = curlevel= 0, size, t=0, pc,B="<br/>",wielding={};

    while (t++<=255) keys[t] = false;

    $(document).keydown (
        function(e){
            t = e.which;
            console.log(t);
            keys[t]=true;
            kOff.st(t);
            gameLoop();
        }
    );
    $(document).keyup ( //TODO CHAIN
        function(e){
            t = e.which;
            keys[t]=false;
        }
    );

    flr = Math.floor;
    mrn = Math.random;
    min = Math.min;
    max = Math.max;
    abs = Math.abs;
    function fgen(r){return function(){return r;}} //My masterpiece  
    function rng(x) {if(!x)return[0];var zQ=rng(x-1);zQ.push(x-1);return zQ;} //Here we go...
    function rnd(l, h){ return l + flr( mrn() * (h-l+1))}
    function rsp(l, h){ return l + flr( mrn() * h)}
    function intersect(a, b){ return a.x == b.x && a.y == b.y }
    function setxy(a, b){a.x = b.x;a.y = b.y}
    function dodmg(a,b){a.HP -= t=max(0,rnd(a.DMG, a.DMX+1)-b.AC+a.STR); writeStatus(a.n + " hit" + (a.n[0]=="T"?"s":"") +  " for " + t + " damage.")} //a hits b

    function relem(x){return x[rnd(0,x.length-1)]} //NEW

    function generateLevel(l){
        var buff=8;
        curlevel=l;
        items=[], monsters=[];
        size = buff*2+25* rsp(2,min(l/2+1,16)),roomn = rsp(3*size/40, 8*size/40);

        map = rng(size).map(function(){return rng(size).map(fgen("#"))}); 
        var rooms=[],r, loops=0,cr;
        var t, q;
        nn = roomn = flr(roomn);
        while(roomn--){
            (r={}).x=rnd(buff,size-buff-15);r.y=rnd(buff,size-buff-15);
            r.w=r.h=rnd(12,15);
            rooms.push(r);
        }

        for (ro in rooms){
            for (var x=(cr=rooms[ro]).x;x<cr.x+cr.w;++x){
                for (var y=cr.y;y<cr.y+cr.h;++y){
                    (q = rnd(0,999)) < 6 ? items.push(new Item(x,y)) :( q < 12 ? monsters.push(new Monster(x,y,l)) : 0); 
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
        map[(dn=relem(rooms)).x+4][dn.y+4] = "&lt;";

        seen= rng(size).map(function(){return rng(size).map(fgen(false))}); 
        Character.x = dn.x+4;
        Character.y = dn.y+4;
    }


    function writeks(d){
        var s="";
        for (k in d)
            s += " <b>"+k+"</b>:" + d[k];
        $("#ks").html(s+B);
    }
    function gameLoop(){
        var oldPosition = {x : Character.x, y : Character.y } ; 
        var a = false;

        Character.HP=min(Character.HP,Character.maxHP);
        if (statschange) { 
            $(".board > span").html("").css("background-color","");
            writeks({"A":"gility","S":"trength","C":"onstitution"});
            t = {65:"AGL",83:"STR",67:"CON"};
            $("#1F1").html("Add to your stats: "+B + 
                    "(A)gility :" + Character.AGL + B + 
                    "(S)trength:" + Character.STR + B + 
                    "(C)onstitution:" + Character.CON + B + "");
            
      
            for (x in t) if (keys[x]) {Character[t[x]]++, statpoints--; writeStatus( statpoints + " points left.");}
            if (statpoints <= 0 ){statschange = false; writeBoard(); } 
            return;
        }

        if (Character.EXP > Character.NXT){
            Character.NXT *=2;
            Character.maxHP += Character.LVL*2+1;
            Character.LVL++;
            writeStatus("<span style='color:red'>Level up! Hit L to adjust your new stats.</span>");
            statpoints++;
        }
        if (showInventory){
            writeks({"Enter":" Use","E":"xamine","ESC":" close Inventory","D":"rop"});
            getInventoryKeys(); 
            Inventory.write();
            if (!showInventory) ssXY(), writeBoard();
        } else {
            writeks({"WASD":" Move", "R":"est","I":"nventory","P":"ick up item", "Walk into a monster":"Attack"+B, ">":"Go up stairs","<":"Go down stairs" });
            a = getKeys();
            pc=map[Character.x][Character.y]; 
            if (a || resting) { 
                resting = !(a || Character.HP == Character.maxHP) 
                if (resting){
                    for (i in monsters)
                        if (bounded(monsters[i].x-screenX) && bounded(monsters[i].y-screenY) && vis[monsters[i].x-screenX][monsters[i].y-screenY]) {
                            writeStatus("A nearby monster wakes you!"); resting = false; break;
                        } 
                }
                moves++;
                Character.HP += resting + (moves%REGENRATE==0 && Character.HP != Character.maxHP)
                for (i in monsters) monsters[i].update(oldPosition);
                
                for (i in items){
                    if (intersect(Character, items[i])){
                         if (items[i].cls == "$"){
                            items[i].use();
                            items.splice(i,1); //TODO: code duplication --sorta :: BAD (maybe have an "in inventory" flag?)
                            writeStatus("You have "+Character.money+"G.");
                            break;
                         } else writeStatus("A " + items[i].getname() + " rolls under your feet.");
                    }
                }
                if (pc == ">") writeStatus("You see stairs leading downward.");
                if (pc == "&lt;") writeStatus("You see stairs leading upward.");
                if (pc == "#") {setxy(Character,oldPosition); writeStatus("You stupidly run into a rock.");} 
                ssXY();
                writeBoard();
            }
        }
        $("#hlth").html(" $: " + Character.money +B+ " LVL: " + Character.LVL +B+ " EXP: " + Character.EXP + "/" + Character.NXT +B+ "HP: " + Character.HP + "/" + Character.maxHP +B+ " DMG: " + (Character.DMG + (t=Character.STR))+  "-" + (Character.DMX +t)+ B+  " STR: " +t  +B+" CON: " + Character.CON +B+ " AGL: " + Character.AGL +B+" AC: " + Character.AC +B+ " Dungeon LVL:" + curlevel +B);
    }

    function writeStatus(status){
        //bold top status
        var ar = $("#status").html().split(">");
        ar.push(status+B); 
        ar.shift();
        $("#status").html( ar.join(">") );
    }

    function initialize(){
    
        for (var i=0;i<sz;i++) { 
          for (var j=0;j<sz;j++) 
            $(".board").append("<span id='"+i+"F"+j+"'>P</span>"); 
        $(".board").append("<br>");
        } 
        gameLoop();
        setInterval(gameLoop,90);
        writeBoard();

    }
    function bounded(x){
        return x>=0 && x<sz;
    }

    function writeBoard(){
    
        var text = [];
        vis = [];
        var html = "";

        vis = rng(size).map(function() {return rng(size).map(fgen(0))}); 

        for (var i=0;i<sz;i++) { 
            text.push([]); 
            for (var j=0;j<sz;j++) text[i].push(map[i+screenX][j+screenY]);
            
        }  

        //TODO abstract out bounded into a function on the object.. or do one better and dont put it on the object...
        for (i in items) if(bounded(items[i].x - screenX) && bounded(items[i].y - screenY)) text[items[i].x - screenX][items[i].y - screenY] = items[i].cls;

        for (i in monsters) if(bounded(monsters[i].x - screenX) && bounded(monsters[i].y - screenY)) text[monsters[i].x - screenX][monsters[i].y - screenY] = monsters[i].rep;

        text[Character.x - screenX][Character.y - screenY] = Character.rep;

        //Mark visibility
        var x0=Character.x - screenX, y0 = Character.y - screenY;
        var rad=6;

        for (var i=x0-rad+0.5;i<=x0+rad+0.5;i++){
            for (var j=x0-rad+0.5;j<=x0+rad+0.5;j++){
                if (Math.sqrt( (i-x0)*(i-x0) +(j-y0)*(j-y0)) -rad<=1 ){
                    //draw line from (x0,y0) to (i,j)
                    var nx,ny;
                    for (var d=0;d<100;d++){
                        nx=flr( d * (i-x0)/100)+x0, ny = flr(d * (j-y0)/100)+y0;
                        if (nx>16||ny>16) continue;
                        vis[nx][ny] = true;
                        seen[nx+screenX][ny+screenY] = true; //replace t/f with "X""y"
                        if (text[nx][ny] == "#") break;
                    }
                }
            }
        }
        
        //TODO consolidate with other thing... 
        
        //console.log(text[ox-screenX][oy-screenY]);
        
        console.log(vis); 
        for (var i=0;i<sz;i++){
            for (var j=0;j<sz;j++){
                var cs = { ".":"black", "C":"red", "j":"blue","$":"gold","a":"cyan" }; 
                var bcs = { ".":"white", "&nbsp;":"black" }; 
                if (!vis[i][j]){ 
                    if (seen[i+screenX][j+screenY]) text[i][j] = map[i+screenX][j+screenY]; else text[i][j] = "&nbsp;";
                }
                
                if ( (t=$("#"+i+"F"+j)).html() != (s=text[i][j])) 
                    t.html(s).css({"color":cs[s] || "black" ,"background-color":bcs[s] || "white" });
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
        80:pickupItem,
        82:function(){ 
        
            writeStatus("You take a quick nap."); resting = true;
        },
        73:function(){writeStatus("You take a moment to examine your inventory. Luckily, all monsters freeze in place. ");showInventory = true; kOff.gt(68)}, //TODO: THIS IS A HACK. FIX IT.
        76:function(){statschange = true;},
        //87:function(){writeStatus("Nice try. Too bad life isn't that easy.");},
        190:function(){if (pc == ">") { writeStatus("You descend the staircase into darker depths..."); generateLevel(++curlevel);} else {writeStatus("There's no staircase here.");} },
        188:function(){if (pc == "<") { writeStatus("You ascend the staircase to safer ground."); generateLevel(--curlevel); } else {writeStatus("There's no staircase here.");} }
    };
    function itemuse(){
        var a=inventory[Inventory.sel];
        if (!a.equipped){
            //about to equip
            if ((a.cls=="e"&&wielding[a.typ])) { writeStatus("You can't wield another item of that type."); return;}
        }
        a.cls=="e"?wielding[a.typ] = !wielding[a.typ]:0;
        a.equipped = !a.equipped;
        if (inventory[Inventory.sel].use()){
            inventory.splice(Inventory.sel, 1);
        }
    }
    function getInventoryKeys(){
        Inventory.sel += keys[83] - keys[87];
        if (kOff.gt(13)) itemuse();
        if (kOff.gt(68)){
            t=inventory[Inventory.sel];
            setxy(t,Character);
            items.push(t);
            inventory.splice(Inventory.sel, 1);
        }

        //if (kOff.gt(69)) writeStatus(inventory[Inventory.sel].getdetails());

        Inventory.sel = max(0, min ( inventory.length - 1, Inventory.sel));
        if (kOff.gt(27)) //(I)nventory
            {showInventory = false; kOff.ks=[];}
    }


    function getKeys(){
        Character.x += keys[83] - keys[87];
        Character.y += keys[68] - keys[65];
        for (i in m) if (kOff.gt(i)) m[i]();

        var change = false;
        for (i in actionkeys) change |= keys[actionkeys[i]]; 
        
        keys[83]=keys[87]=keys[68]=keys[65]=false;
        return change;
    }

    scrolltypes = [ //{name:"Summon Monster", lv : 1},
                    //{name:"Identify", lv : 1},
                    {name:"Teleport", lv : 1}
                    ];

    function Item(x, y){
        this.x=x;
        this.y=y;
        this.id=0;
        this.cls = "";
        this.identified = false;
        this.equipped = false;
        this.spec = {}; 
        this.n = "";
        this.typ="";
        this.d="";
        this.getname = function() { 
            return this.n;
        }
        this.init = function() { 
            this.identified = mrn() > .5;
            
            t = this.cls = relem(["p", "e", "$", "?"])

            if (t == "$"){
                this.spec["money"] = -rnd(curlevel, (1+curlevel)*7);
            }
            if (t == "?"){
                do {this.id = rnd(0,scrolltypes.length-1);} while (scrolltypes[this.id].lv > curlevel);
                this.n = "unidentified scroll";
                //TODO: once you use it once, you know what it does.
            }

            var d2;
            if (t== "e"){
                //x to y damage
                //+N to strength
                this.d = typedescriptions[t][d2];
                d2=rnd(0,typedescriptions["e"].length-1);
                if (d2<8){ 
                    this.spec["DMX"] = (this.spec["DMG"]= rnd(1+curlevel, 2*curlevel+4)) + rnd(1,2+3*(1+curlevel));
                    this.spec["STR"] = max(0,rnd(0,100)-95);
                    this.typ="w";
                } else { 
                    this.spec["AC"]=rsp((d2-7)*2,curlevel*2);
                    this.typ =typedescriptions[t][d2];
                }
                this.n= (this.identified ? relem(descriptors) : "mysterious ") + " " +  this.d + " "+ (this.identified ? relem(finaldescriptors[t]):"");
            }
            if (t== "p"){
                this.n = "Potion of thingy";
                this.spec["HP"] = rnd( curlevel*2+1, (curlevel+3)*6);
            }

        }
        this.use = function() {
            var s=this.spec,c=this.cls;
            if (c=="?"){
                writeStatus("You read the scroll.");
                showInventory = false;
                //for now, just teleport.
                var x,y;
                do{
                    x = rsp(0,size);
                    y = rsp(0,size);
                } while (map[x][y] == "#");
                Character.x=x;
                Character.y=y;
                writeStatus("You suddenly appear somewhere else!");
            } else {
                if (this.equipped) { 
                    for (x in s) Character[x] += s[x] != null ? s[x] : 0;
                    if (c=="p") writeStatus("You drink the potion. Yummy! +" + s["HP"] + "HP");
                    if (c=="e") writeStatus("You wield the object. You can't wait to pwn some noobs.");
                } else { 
                    for (x in s) Character[x] -= s[x] != null ? s[x] : 0;
                    if (c=="e") writeStatus("You unwield the object.");
                }
            }
            return (c == "$" || c == "p" || c=="?"); //destroy
        }
        this.init(); 
    }

    //follow: 0 = never. 1 = after attacked. 2 = always, 3 = never moves...
    //if not defined ignore them (flock)
    //lvl = min level to encounter on
    ms = [{rep : "C", nm : "Cobol", lvl: 1, DMG:"", DMX:"", HP:5, follow:1},
          {rep : "j", nm : "Jerk", lvl: 1, DMG:"", DMX:"", HP:3, follow:2},
          {rep : "s", nm : "Slime heap", lvl: 2, DMG:"", DMX:"", HP:40, follow:3}
    ];
    var MNS=ms.length;


    function Monster(x, y, l) { 
        do this.z=rsp(0,MNS); while(ms[this.z].lvl>l) 
        this.rep = ms[this.z].rep; 
        this.x = x;
        this.y = y;
        this.STR = rnd(l+1,l*2+1) ;
        this.DMG = rnd(l, l*2);
        this.DMX = rsp(this.DMG+1, this.DMG*2);
        this.AGL = 3;
        this.AC = 1;
        this.n = "The " + ms[this.z].nm;
        this.hsh = rnd(0,1e9);
        this.maxHP = this.HP = ms[this.z].HP * (1+mrn());
        this.follow = ms[this.z].follow == 2;
        this.update = function(oldPosition) {
            if (intersect(this, Character)) {
                //CHECK DEATH (both) -- maybe do that later...
                dodmg(Character,this);
                this.follow=1;
                if (this.HP > 0 || this.AGL > Character.AGL) dodmg(this,Character);
                if (this.HP < 0){ 
                    writeStatus("Holy crap! "+this.n+" explodes in a huge explosion of blood! It's really gross!");
                    Character.EXP += flr(this.STR * this.maxHP/3)+1;
                    if (rnd(0,5) <2) { items.push(new Item(this.x, this.y)); writeStatus("The monster dropped an item.")}
                    for (i in monsters) if (monsters[i] == this) monsters.splice(i, 1);
                }

                setxy(Character, oldPosition);
            } else { 
                if (this.follow==3) return;
                var op = {x : this.x, y: this.y};

                if (this.follow){ 
                    this.x != Character.x ? ( this.x>Character.x? this.x--: this.x++):0;
                    this.y != Character.y ? ( this.y>Character.y? this.y--: this.y++):0;
                } else { 
                    this.x += rnd(0,2)-1;
                    this.y += rnd(0,2)-1;
                }
                for (x in monsters) if (this.hsh!=monsters[x].hsh && intersect(this,monsters[x])) setxy(this, op);
                if (map[this.x][this.y] == "#") setxy(this, op) 
                if (intersect(this, Character)) {
                    dodmg(this,Character); //TODO even better is a recursive call.
                    setxy(this, op) 
                }
            }
        }; 
    }; 

    var Character = { 
        x : 5,
        y : 8,
        HP : 18,
        maxHP : 18,
        money : 0,
        DMG : 2, 
        DMX : 5, 
        AGL : 4,
        EXP : 0,
        NXT : 10,
        CON : 10,
        STR : 4,
        AC : 1,
        LVL : 1,
        n : "You",
        rep : (function() { 
            return (this.HP == this.maxHP) ? "@" : (this.HP / this.maxHP).toString()[2]; //Possible bug when YOU ARE DEAD //TODO david said i could optimize this
        })()
    };


    var Inventory = { 
        sel : 0,
        write : function () {
            var inv = ""; 
            $(".board > span").html("").css({"background-color":"","color":""});
            for (i in inventory) $("#"+i+"F0").html((  this.sel==i ? "*" : (inventory[i].equipped ? "+" :  "-"))+ inventory[i].getname() + (inventory[i].equipped ? "[equipped]" : "") );
            $("#board").html(inv);
        }

    };
    function ssXY(){
        screenX = min( max(0, Character.x - sz/2), size - sz);
        screenY = min( max(0, Character.y - sz/2), size - sz);
    }

    generateLevel(1);
    ssXY();
    initialize(); 

});

