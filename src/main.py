from flask import Flask 

app = Flask(__name__)

#decorator - connects a url path to a funciton 
@app.route('/chat',methods = ['POST'])#methods is used to explicitely tell flask to accept POST



def POST():
    data  = request.get_json()

    return "Message received !"

if __name__ == '__main__':
    app.run()




#NOTES 
# 1. By default Flask routes only accept GET so you have to explicitly tell it to accept POST.