from flask import Flask 
from flask import request

app = Flask(__name__)

#decorator - connects a url path to a funciton 
@app.route('/chat',methods = ['POST'])#methods is used to explicitely tell flask to accept POST
def chat():
    data  = request.get_json()
    print(data)
    print(data["message"])
    return "Message received !"

if __name__ == '__main__':
    app.run()




#NOTES 
# 1. By default Flask routes only accept GET so you have to explicitly tell it to accept POST.
# 2. In Flask, anything created at the module level gets created once when the server starts and stays alive as long as the server is running.

