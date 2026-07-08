

function sendMessage()
{
    let prompt = document.getElementById("prompt");
    if(prompt.value == "")
    document.getElementById("conversation").innerHTML+="<p class = 'user_message'>" + prompt.value+ "</p>";
    fetch('/chat',{
        method:'POST',
        headers:{'Content-Type':'application/json'
        },
        body:JSON.stringify({message: prompt.value})})
    .then(response=>response.text())
    .then(data=> document.getElementById("conversation").innerHTML += "<p class = 'ai_message'>"+marked.parse(data)+"</p>")
    document.getElementById("prompt").value = "";
    window.scrollTo(0, document.body.scrollHeight);
}

