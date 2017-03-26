#!/usr/bin/python

import sys, re

# Use double colons and double semicolons to separate in replacements.db

username, userid, message = sys.argv[1], sys.argv[2], sys.argv[3]

replacements = [l.split('::') for l in open('replacements.db').read().split(';;')]

for r in replacements:
    if not r[0].endswith("$"):
        # force match from start to end; don't worry about
        # including a ^ at the start since we are using
        # re.match
        r[0] += "$"

for i in range(1,len(replacements)):
    replacements[i][0] = replacements[i][0][1:]

results = ""

for r in replacements:
    if re.match(r[0],message):
        results += re.sub("("+re.escape(username)+")("+re.escape(userid)+")"+r[0],
                          r[1], username+userid+message) + "\n"

print(results)
