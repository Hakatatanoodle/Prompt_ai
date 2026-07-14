

function sendMessage()
{
    let prompt = document.getElementById("prompt");
    if(prompt.value == "") return;
    document.getElementById("conversation").innerHTML+="<p class = 'user_message'>" + prompt.value+ "</p>";
    fetch('/chat',{
        method:'POST',
        headers:{'Content-Type':'application/json'
        },
        body:JSON.stringify({message: prompt.value})})
    .then(response=>response.json())
    .then(data=>
    {
        if(data.is_final)
        {
            let finalPrompt = data.prompt;
            document.getElementById("final_prompt").innerHTML+="<p>"+finalPrompt+"</p>"
        }
        else
        {
            document.getElementById("conversation").innerHTML+= "<p class = 'ai_message'>"+data.message+"</p>"
        }
    }
    )
    document.getElementById("prompt").value = "";
    window.scrollTo(0, document.body.scrollHeight); 
}

