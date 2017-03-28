#!/usr/bin/python

import sys, re

# Use double colons and double semicolons to separate in responses.db

requesttype = sys.argv[1]
if requesttype == "query":
    username, userid, message = sys.argv[2], sys.argv[3], sys.argv[4]

    responses = [l.split('::') for l in open('responses.db').read().split(';;')]

    for r in responses:
        if not r[0].endswith("$"):
            # force match from start to end; don't worry about
            # including a ^ at the start since we are using
            # re.match
            r[0] += "$"

    for i in range(1,len(responses)):
        responses[i][0] = responses[i][0][1:]

    results = ""

    for r in responses:
        if re.match(r[0],message):
            results += re.sub("("+re.escape(username)+")("+re.escape(userid)+")"+r[0],
                              r[1], username+userid+message) + "\n"

    print(results)
