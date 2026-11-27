import Fastify from "fastify";
import { access } from "./src/supabase.js";
import { sendMessage } from "./src/orch.js";

const fastify = Fastify({
  //logger: true
})

fastify.get('/supabase-test', async (request, reply) => {
    const getRecords = await new access().get(
        'chats',
        '*'
    )

    reply.send({ getRecords })
})

fastify.post('/messages/:user_id', async (request, reply) => {
    try {
        const user_id = request.params.user_id
        //console.log(request.body, user_id, 111)
        const { message } = request.body

        const data = await sendMessage(user_id, message)

        //const data = request.body
        reply.send({data})

    } catch (e) {
        reply.code(404).send({error: 'Something went wrong: '})
        console.log(e)
    }

})


fastify.get('/api-test', function (request, reply) {
  reply.send({ status: '200 OK' })
})

fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  console.log('Fastify @', address)
})
