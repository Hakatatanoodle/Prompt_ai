function sendMessage()
{
    let prompt = document.getElementById("prompt");
    document.getElementById("conversation").innerHTML+="<p>" + prompt.value+ "</p>";
    fetch('/chat',{
        method:'POST',
        headers:{'Content-Type':'application/json'
        },
        body:JSON.stringify({message: prompt.value})})
    .then(response=>response.text())
    .then(data=> document.getElementById("conversation").innerHTML += "<p>"+data+"</p>")
}

