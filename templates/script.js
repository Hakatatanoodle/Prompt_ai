function sendMessage()
{
    let prompt = document.getElementById("prompt");
    document.getElementById("conversation").innerHTML+="<p> + prompt.value+ </p>";
    fetch('/chat',{methods:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message: prompt.value})})
    .then(response=>response.json())
    .then(data)
}

