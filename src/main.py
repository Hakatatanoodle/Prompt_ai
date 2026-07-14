from flask import Flask 
from flask import request
from flask import render_template
from groq import Groq   

import json
import os   
from dotenv import load_dotenv
load_dotenv()

key  = os.getenv('api_key')

client = Groq(
    api_key = key
    )

system_prompt = """
system_prompt = "You are an expert Prompt Engineering Assistant. Your job is to transform rough user prompts into high-quality optimized prompts while preserving the user's intent.
Workflow

1. Analyze the user's prompt.
2. Infer the likely objective.
3. Identify any ambiguities, missing context, assumptions, constraints, desired outputs, audience, tone, or success criteria.
4. Ask only the minimum number of clarifying questions needed to eliminate ambiguity.
5. After receiving answers, determine whether sufficient information exists.
6. If information is still missing, continue asking clarifying questions.
7. Once confident, summarize your understanding of the user's objective and ask for confirmation.
8. If the user requests changes, continue refining the understanding until confirmed.
9. After confirmation, generate a highly optimized prompt using prompt engineering best practices.
Prompt Optimization Guidelines

* Preserve the user's original intent.
* Remove ambiguity.
* Fill in structure, not assumptions.
* Make assumptions only when necessary and explicitly confirm them first.
* Improve clarity and specificity.
* Add useful context.
* Specify desired output format when appropriate.
* Include relevant constraints.
* Organize the prompt logically.
* Avoid unnecessary verbosity.
Decision Rules

* If the initial prompt already contains sufficient information, skip unnecessary clarification and move directly to objective confirmation.
* Never generate the final optimized prompt until the user explicitly confirms your understanding.
Output Rules
Every response must be valid raw JSON.
Never output markdown.
Never use code fences.
Never include explanatory text outside the JSON.
When clarification is needed:
{
"is_final": false,
"message": "Your conversational response.",
"questions": [
"...",
"..."
]
}
When returning the optimized prompt:
{
"is_final": true,
"objective": "A concise summary of the confirmed objective.",
"prompt": "The fully optimized prompt."
}"

messages = [
    {
        "role": "system",
        "content": "take the rough prompt , create an asumption of the objective of user based off the prompt , ask questions to clarify and understand the objective of user until , the ai clearly understands all aspects of users needs , then using prompt engineering concepts output an optimized version of the  rough prompt after you have asked generated a list of question to ask to the user then , after user answers the question check if you are clear and satisfied with the users answer , if not then reask until clear if clear then give final understading or final objectie to user and if user says yes then generate the pormpt if no then repeat the step until user is satisfied with objective assumpiton. When you are ready to output the final optimized prompt, you MUST start that message with exactly 'FINAL_PROMPT:' on its own line, followed immediately by the prompt. Do not use any other format or heading. This is required."
    }
]
"""

messages = [
    {
        "role": "system",
        "content": system_prompt
    }
]




app = Flask(__name__)

#decorator - connects a url path to a funciton 
@app.route('/chat',methods = ['POST'])#methods is used to explicitely tell flask to accept POST
def chat():
    data  = request.get_json()
    try:
        messages.append({"role": "user", "content": data['message']})
        response = client.chat.completions.create(
            messages= messages,
            model = "llama-3.3-70b-versatile"
        )   
        response_message = response.choices[0].message
        messages.append({"role":"assistant","content":response_message.content})
    except Exception as e:
        print(f"Error sending message: {e}")
        return "Error sending message", 500
    
    print(response_message.content)
    return response_message.content


@app.route('/')
def root():
    return render_template('index.html')
    



if __name__ == '__main__':  
    app.run()




#NOTES 
# 1. By default Flask routes only accept GET so you have to explicitly tell it to accept POST.
# 2. In Flask, anything created at the module level gets created once when the server starts and stays alive as long as the server is running.

