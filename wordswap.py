#
# Uber top secret code for hyper code compression optimizations.
#
# DONT LOOK IF YOU ARE DOING 10K!!!
#
# :)

import re
import os
import sys

f = "".join([l for l in file("test2.js")])

replacements = { 
                 "\n" : "",
                 "screenX" : "sX",
                 "screenY" : "sY",
                 "true" : "1",
                 "false" : "0",
                 "curlevel": "cL",
                 "update": "Up",
                 "follow": "FW",
                 "flock": "FL",
                 "equipped": "eQ",
                 "identified": "iD",
                 "money": "mN",
                 "resting" : "rS",
                 "stop": "sT",
                 "maxHP": "mh",
                 "spec" : "Sp",
                 "getdetails": "GDT", }

for x in replacements:
    f = f.replace(x, replacements[x])

if "console" in f:
    print "Warning. console.log is still in code, even though it is useless. Removing..."
    f = re.sub(r'console.*?;', '', f)


print ""

print "Strings found:"

first_strs = re.findall(r'".+"', f)

strs = []

for x in range(len(first_strs)):
    if x%2==0: continue
    strs.append[first_strs[x]]

print strs


os.remove("best.js")

outfile = open("best.js", "w") #write automatically to best.js
sys.stdout = outfile
print f
outfile.close() 

