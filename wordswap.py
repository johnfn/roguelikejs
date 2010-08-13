#
# Uber top secret code for hyper code compression optimizations.
#
# DONT LOOK IF YOU ARE DOING 10K!!!
#
# :)

import re
import os
import sys

f = "\n".join([l for l in file("test2.js")])

#generate unused 2 letter variable names
di = {}

alpha="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
alphanum = alpha + "1234567890"

for a in alpha:
    for b in alphanum:
        di[a+""+b] = True

for (i, c) in enumerate(f[:-2]):
    di[c+f[i+1]] = False

vars_left = []

for x in di: 
    if di[x]:
        vars_left.append(x)

replacements = { 
                 "\n" : "",
                 "true" : "1",
                 "false" : "0", } 
munge = [
             "screenX" ,
             "screenY" ,
             "curlevel",
             "update",
             "follow",
             "flock",
             "equipped",
             "identified",
             "money",
             "resting" ,
             "stop",
             "maxHP",
             "spec" ,
             "getdetails", 
             "roomn",
             "scrolltypes",
           ]

for x in replacements:
    f = f.replace(x, replacements[x])

for x in munge:
    f = f.replace(x, vars_left.pop())

if "console" in f:
    print "Warning. console.log is still in code, even though it is useless. Removing..."
    f = re.sub(r'console.*?;', '', f)

if "Math.floor" in f:
    print "Math.floor detected. Recommended replacing with ~~."

#Find all functions, document how many times they are called vs size.

start = 0
#while f[start:].find("function") != -1:

print ""

print "Strings found:"

strs = []
qseen = 0 

for c in f:
    if c=='"':
        qseen+=1
        if qseen%2==1: strs.append("")
        continue
    if qseen%2==1:
        strs[-1] += c

words = {}

for s in strs:
    for w in s.split(" "):
        #Parse extraneous characters out of w
        w=w.lower()
        no_extr = ""
        for c in w:
            if c in ["," , ".", "'", "!"]: continue
            no_extr += c
        if len(no_extr) <= 2: continue #It's pretty hopeless to optimize tiny strings
        if no_extr not in words:
            words[no_extr] = 0
        words[no_extr] += 1

def cmp(x, y):
    return y[1]-x[1]

counts = [(x, words[x]) for x in words]

counts.sort(cmp)

print "Recommend optimizing the following strings to variables"
savings = 0
for w in counts: #We can theoretically optimize out the space most of the time (if not both spaces in some cases
    if w[1]==1: break
    s = max(len(w[0]) - 3, 0) * (w[1]-1)-1-1-2
    if s>0:
        print w[0] + ", appearing", w[1], "times"
        savings += s 

#The optimal way to assign is [x,y,z]="s1|s2|s3".split("|")

#"a your f"
#"a "+f+"f"

print "Approximate savings with 2-letter variable names:", savings



if "this" in f: 
    j = f.split("this.") 
    print len(j), "'this' keywords. Now, I'm not recommending this or anything, but if you were to replace them all with with(this) blocks, you would save about ", len(j)*5 , "B."

os.remove("best.js")


print "Ending file size: ", len(f)

outfile = open("best.js", "w") #write automatically to best.js
sys.stdout = outfile
print f
outfile.close() 

