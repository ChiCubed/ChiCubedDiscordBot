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

    for i in range(len(responses)):
        responses[i][0] = responses[i][0].strip()

    results = ""

    for r in responses:
        if re.match(r[0],message):
            results += re.sub("("+re.escape(username)+")("+re.escape(userid)+")"+r[0],
                              r[1], username+userid+message) + "\n"

    print(results)
elif requesttype == "add":
    response = sys.argv[2]
    
    open('responses.db','a').write(response+'\n')
elif requesttype == "list":
    i = 0;
    for l in open('responses.db').read().split(';;'):
        if not l.strip(): break
        print('**`'+str(i)+': `**`' + l.split('::')[0].strip() + '`\n`' + l.split('::')[1] + '`\n')
        i += 1
elif requesttype == "delete":
    r = []
    for l in open('responses.db').read().split(';;'):
        if not l.strip(): break
        r.append(l)
    
    i = int(sys.argv[2])
    if i < 0 or i >= len(r):
        print('Invalid number: ' + str(i) + ' out of range')
    else:
        del r[i]
        
        new = open('responses.db','w')
        for l in r:
            new.write(l+';;')
        new.write('\n')
        new.close()
