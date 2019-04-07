import sys
import json
import nblogic

nb = nblogic.KLOGIC(apiMode=True)

args = sys.argv
username = args[1]
password = args[2]
mode = args[3]

if(nb.authentication(username, password)):
    if mode == "authen":
        nb.get_bio()
        nb.get_information()
        nb.get_program_course()
        print(json.dumps(json.loads(nb.json(language="EN"))))
    sys.stdout.flush()

