from flask import Flask 
from flask import request
from flask import render_template
from google import genai 
from google.genai import types

import os   

key  = os.environ.get('api_key')

client = genai.Client(api_key = key)

chat_session = client.chats.create(
    model = "gemini-1.5-flash", 
    config = types.GenerateContentConfig(
        system_instruction = "take the rough prompt , create an asumption of the objective of user based off the prompt , ask questions to clarify and understand the objective of user until , the ai clearly understands all aspects of users needs , then using prompt engineering concepts output an optimized version of the  rough prompt"
)
) 

app = Flask(__name__)

#decorator - connects a url path to a funciton 
@app.route('/chat',methods = ['POST'])#methods is used to explicitely tell flask to accept POST
def chat():
    data  = request.get_json()
    response = chat_session.send_message(data["message"])
    print(response.text)
    return response.text


@app.route('/')
def root():
    return render_template('index.html')
    



if __name__ == '__main__':  
    app.run()




#NOTES 
# 1. By default Flask routes only accept GET so you have to explicitly tell it to accept POST.
# 2. In Flask, anything created at the module level gets created once when the server starts and stays alive as long as the server is running.

