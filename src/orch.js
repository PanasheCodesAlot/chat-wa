import { pingLlm } from "./ai.js";
import { access, supabase } from "./supabase.js";
import { startingNewChat } from "./sysPrompts.js";

// -1. Check if user exists, else create user
// 0. Downloading previous messages from user
// 1. Recording the message sent by the user
// 2. Prompting the AI the create a message
// 3. Saving the new prompt message
// 4. Returning the prompt message to user
export async function sendMessage (user_id, message) {
    //-1
    const userReq = await supabase.from('users')
    .upsert(
        {  id: user_id },
        { onConflict: 'id' }
    ).select()
    .single()

    console.log(userReq)

    const user = userReq.data

    //0.
    const messagesReq = await new access().get('messages',
        '*',
        {
            eq: {user_id: user.id}
        }
    )

    const messages = messagesReq.data
    messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

    //1
    const newUserMessageReq = await new access().add(
        'messages',
        {
            message,
            user_id,
            role: 'user'
        }
    )

    //2
    const LLMReadyMessages = messages.map(m => ({
        role: m.role,
        content: m.message
    }))

    LLMReadyMessages.push({
        role: 'user',
        content: message
    })

    console.log(LLMReadyMessages)
    // return

    const systemPrompt = startingNewChat()

    const aiReq = await pingLlm(LLMReadyMessages, systemPrompt)
    const newLLmMessage = aiReq.data

    //3
    const newLLmMessageAddToDbReq = await new access().add(
        'messages',
        {
            user_id,
            message: newLLmMessage,
            role: 'assistant',
        }
    )
    

    //
    return {data: newLLmMessage}


    







}