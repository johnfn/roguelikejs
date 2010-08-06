f = "".join([l for l in file("test.js")])
replacements = { "screenX" : "sX",
                 "screenY" : "sY",
                 "curlevel": "cL",
                 "update": "Up",
                 "follow": "FW",
                 "flock": "FL",
                 "equipped": "eQ",
                 "identified": "iD",
                 "money": "mN",
                 "stop": "sT",
                 "maxHP": "mh",
                 "spec" : "Sp",
                 "getdetails": "GDT", }

for x in replacements:
    f = f.replace(x, replacements[x])


print f

