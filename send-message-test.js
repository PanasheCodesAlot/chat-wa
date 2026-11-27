const headers = new Headers()
headers.set('Content-Type', 'application/json')
headers.set('Accept', 'application/json')

const req = await fetch('http://localhost:3000/messages/panashe', {
    method: 'POST',
    headers,
    body: JSON.stringify({
        message: 'Hey there'
    })

})

const data = await req.json()

console.log(data)