const req = await fetch('http://localhost:3000/supabase-test', {
    method: 'GET',

})

const data = await req.json()

console.log(data)