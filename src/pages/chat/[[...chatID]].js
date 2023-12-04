import { getSession } from "@auth0/nextjs-auth0";
import { faRobot } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ChatSidebar } from "../../../Components/ChatSidebar";
import { Message } from "../../../Components/Messages";
import clientPromise from "lib/mongodb";
import { ObjectId } from "mongodb";
import Head from "next/head";
import { useRouter } from "next/router";
import { streamReader } from "openai-edge-stream";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";

export default function ChatPage({ chatId, title, messages = [] }) {
  console.log("props: ", title, messages);
  const [newChatId, setNewChatId] = useState(null);
  const [incomingMessage, setIncomingMessage] = useState("");
  const [messageText, setMessageText] = useState("");
  const [newChatMessages, setNewChatMessages] = useState([]);
  const [generatingResponse, setGeneratingResponse] = useState(false);
  const [fullMessage, setFullMessage] = useState("");
  const [originalChatId, setOriginalChatId] = useState(chatId);
  const router = useRouter();

  const routeHasChanged = chatId !== originalChatId;

  // when our route changes
  useEffect(() => {
    setNewChatMessages([]);
    setNewChatId(null);
  }, [chatId]);

  // save the newly streamed message to new chat messages
  useEffect(() => {
    if (!routeHasChanged && !generatingResponse && fullMessage) {
      setNewChatMessages((prev) => [
        ...prev,
        {
          _id: uuid(),
          role: "assistant",
          content: fullMessage,
        },
      ]);
      setFullMessage("");
    }
  }, [generatingResponse, fullMessage, routeHasChanged]);

  // if we've created a new chat
  useEffect(() => {
    if (!generatingResponse && newChatId) {
      setNewChatId(null);
      router.push(`/chat/${newChatId}`);
    }
  }, [newChatId, generatingResponse, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneratingResponse(true);
    setOriginalChatId(chatId);
    setNewChatMessages((prev) => {
      const newChatMessages = [
        ...prev,
        {
          _id: uuid(),
          role: "user",
          content: messageText,
        },
      ];
      return newChatMessages;
    });
    setMessageText("");

    //console.log("NEW CHAT: ", json);
    const response = await fetch(`/api/chat/sendMessage`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ chatId, message: messageText }),
    });
    const data = response.body;
    if (!data) {
      return;
    }

    const reader = data.getReader();
    let content = "";
    await streamReader(reader, (message) => {
      console.log("MESSAGE: ", message);
      if (message.event === "newChatId") {
        setNewChatId(message.content);
      } else {
        setIncomingMessage((s) => `${s}${message.content}`);
        content = content + message.content;
      }
    });

    setFullMessage(content);
    setIncomingMessage("");
    setGeneratingResponse(false);
  };

  const allMessages = [...messages, ...newChatMessages];

  return (
    <>
      <Head>
        <title>New chat</title>
      </Head>
      <div className="grid h-screen grid-cols-[260px_1fr]">
        <ChatSidebar chatId={chatId} />
        <div className="flex flex-col overflow-hidden bg-gray-700">
          <div className="flex flex-1 flex-col-reverse overflow-scroll text-white">
            {!allMessages.length && !incomingMessage && (
              <div className="m-auto flex items-center justify-center text-center">
                <div>
                  {/* <FontAwesomeIcon
                    icon={faRobot}
                    className="text-6xl text-emerald-200"
                  /> */}
                  <h1 className="mt-2 text-4xl font-bold text-white/50">
                    Ask me a question!
                  </h1>
                </div>
              </div>
            )}
            {!!allMessages.length && (
              <div className="mb-auto">
                {allMessages.map((message) => (
                  <Message
                    key={message._id}
                    role={message.role}
                    content={message.content}
                  />
                ))}
                {!!incomingMessage && !routeHasChanged && (
                  <Message role="assistant" content={incomingMessage} />
                )}
                {!!incomingMessage && !!routeHasChanged && (
                  <Message
                    role="notice"
                    content="Only one message at a time. Please allow any other responses to complete before sending another message"
                  />
                )}
              </div>
            )}
          </div>
          <footer className="bg-gray-800 p-10">
            <form onSubmit={handleSubmit}>
              <fieldset className="flex gap-2" disabled={generatingResponse}>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={generatingResponse ? "" : "Send a message..."}
                  className="w-full resize-none rounded-md bg-gray-700 p-2 text-white focus:border-emerald-500 focus:bg-gray-600 focus:outline focus:outline-emerald-500"
                />
                <button type="submit" className="rounded-md bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-600 disabled:bg-emerald-300">
                  Send
                </button>
              </fieldset>
            </form>
          </footer>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps = async (ctx) => {
  const chatId = ctx.params?.chatId?.[0] || null;
  if (chatId) {
    let objectId;

    try {
      objectId = new ObjectId(chatId);
    } catch (e) {
      return {
        redirect: {
          destination: "/chat",
        },
      };
    }

    const { user } = await getSession(ctx.req, ctx.res);
    const client = await clientPromise;
    const db = client.db("ChatGPT");
    const chat = await db.collection("chats").findOne({
      userId: user.sub,
      _id: objectId,
    });

    if (!chat) {
      return {
        redirect: {
          destination: "/chat",
        },
      };
    }

    return {
      props: {
        chatId,
        title: chat.title,
        messages: chat.messages.map((message) => ({
          ...message,
          _id: uuid(),
        })),
      },
    };
  }
  return {
    props: {},
  };
};


// import Image from 'next/image'
// import { Inter } from 'next/font/google'
// import {ChatSidebar} from '../../../Components/ChatSidebar'
// import { useState } from 'react'
// import { streamReader } from 'openai-edge-stream'
// import {v4 as uuid} from 'uuid'
// import { Message } from '../../../Components/Messages/Message'

// const inter = Inter({ subsets: ['latin'] })

// export default function ChatPage() {

//   const[incommingMessage,setIncommingMessage]=useState("");
//   const[messageText,setMessageText]=useState("");
//   const[newChatMessages,setNewChatMessages]=useState([]);
//   const[generatingResponse,setRegeneratingResponse]=useState("")

//   const handleSubmit=async(e)=>{
//     e.preventDefault();

//     setRegeneratingResponse(true)
//     setNewChatMessages(prev=>{
//       const newChatMessages=[...prev,
//       {
//         _id:uuid(),
//         role:"user",
//         content:messageText,
//       },];
//       return newChatMessages;
//     });

//     setMessageText("");
//     console.log("message Text:",messageText);

//     const response = await fetch('/api/chat/sendMessage',{
//       method:'POST',
//       headers:{
//         'content-type':'application/json',
//       },
//       body:JSON.stringify({message:messageText}),
//     });

//     const data=response.body;
//     if(!data){
//       return;
//     }

//     const reader=data.getReader();
//     await streamReader(reader,async(message)=>{
//       console.log("Message",message);
//       setIncommingMessage(s=>`${s}${message.content}`)
//     });
//     setRegeneratingResponse(false)
//   };

//   return (
//     <>
//       <div className='grid h-screen grid-cols-[260px_1fr]'>
//         <ChatSidebar/>
//         <div className='flex flex-col bg-gray-700'>
//           <div className='flex-1 text-white'>

//             {newChatMessages.map((message)=>{
//               <Message key={message._id} 
//               role={message.role} 
//               content={message.content}/>
//             })}

//             {!!incommingMessage && (
//               <Message
//               role="assistant" 
//               content={incommingMessage}/>
//             )}

//             </div>
//           <div className='bg-gray-800 p-10'>
//             <form onSubmit={handleSubmit}>
//               <fieldset className='flex gap-2' disabled={generatingResponse}>
//                 <textarea value={messageText} onChange={(e)=>setMessageText(e.target.value)} placeholder={generatingResponse ?"":'Send a message...'} className='w-full resize-none rounded-md bg-gray-700 p-2 text-white focus:border-emarald-500 focus:bg-gray-600 focus:outline focus:outline-emarald-500'/>
//                 <button type='submit' className='rounded-md bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-600 disabled:bg-emerald-300'>send</button>
//               </fieldset>
//             </form>
//           </div>
//         </div>
//       </div>
//     </>
//   )
// }


// 'use client';

// import { useState, useRef } from "react";

// enum Creator{
//   Me=0,
//   Bot=1
// }

// interface MessageProps{
//   text:string,
//   from:Creator,
//   key:number
// }

// interface InputProps{
//   onSend:(input:string)=>void;
//   disabled:boolean;
// }


// const ChatMessage=({text,from}:MessageProps)=>{
//   return(
//     <>
//       {from==Creator.Me && (
//         <div className="bg-white p-4 rounded-lg flex gap-4 items-center whitespace-pre-wrap">
//           <img src="https://www.dreamstime.com/random-click-squirrel-wire-random-picture-cute-squirrel-image219506797" alt="user"></img>
//           <p className="text-grey-700">{text}</p>
//         </div>
//       )}
//       {from==Creator.Bot && (
//         <div className="bg-gray-100 p-4 rounded-lg flex gap-4 items-center whitespace-pre-wrap">
//           <img src="https://www.dreamstime.com/random-click-squirrel-wire-random-picture-cute-squirrel-image219506797" alt="user"></img>
//           <p className="text-grey-700">{text}</p>
//         </div>
//       )}
//     </>
//   );
// };


// const ChatInput=({onSend,disabled}:InputProps)=>{
//   const[input,setInput]=useState("");

//   const sendInput=()=>{
//     onSend(input);
//     setInput('');
//   };

//   const handleKeyDown=(event:any)=>{
//     if(event.keyCode===13){
//       sendInput();
//     }
//   };

//   return(
//     <div className="bg-white border-2 p-2 rounded-lg flex justify-center">
//       <input
//         value={input}
//         onChange={(ev:any)=>setInput(ev.target.value)}
//         className="w-full py-2 px-3 text-gray-800 rounded-lg focus:outline-none"
//         type="text"
//         placeholder="Ask me anything"
//         disabled={disabled}
//         onKeyDown={(ev)=>handleKeyDown(ev)}
//       />
//       {disabled &&(
//         <svg
//           aria-hidden="true"
//           className="mt-1 w-8 h-8 mr-2 text-gray-200 animate-spin fill-blue-600"
//           viewBox="0 0 100 101"
//           fill="none"
//           xmlns="http://www.w3.org/2000/svg"
//          >
//           <path
//             d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908"
//             fill="currentColor"
//           />
//           <path
//             d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92"
//             fill="currentFill"
//           />
//         </svg>       
//       )}  
//       {!disabled && (
//         <button
//           onClick={()=>sendInput()}
//           className="p-2 rounded-md text-gray-500 bottom-1.5 right-1"
//         >
//           <svg
//             xmlns="http://www.w3.org/2000/svg"
//             fill="none"
//             viewBox="0 0 24 24"
//             strokeWidth="1.5"
//             stroke="currentColor"
//             className="w-6 h-6"
//           >
//           <path
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             d="M6 12L32.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0"/>
//           </svg>  
//         </button>  
//       )}
//     </div>
//   )

// };

// export default function Home(){
  
//   // const [messages, setMessages, messagesRef]=useState<MessageProps[]>([]);
//   // const messagesRef:MessageProps[]=[];
//   const [messages, setMessages] = useState<MessageProps[]>([]);
//   const messagesRef = useRef<MessageProps[]>([]);

//   const [loading,setLoading]=useState(false);

//   const callApi=async(input:string)=>{
//     setLoading(true);

//     const myMessage:MessageProps={
//       text:input,
//       from:Creator.Me,
//       key:new Date().getTime()
//     };

//     setMessages([...messagesRef.current,myMessage]);
//     const response=await fetch('/api/generate-answer',{
//       method:'POST',
//       headers:{
//         'Content-Type':'application/json'
//       },
//       body:JSON.stringify({
//         prompt:input
//       })
//     }).then((response)=>response.json());
//     setLoading(false);

//     if(response.text){
//       const botMessage:MessageProps={
//         text:response.text,
//         from:Creator.Bot,
//         key:new Date().getTime()
//       };
//       setMessages([...messagesRef.current,botMessage]);
//     }else{

//     }
//   };

//   return(
//     <main className="relative max-w-2xl mx-auto">
//       <div className="sticky top-0 w-full pt-10 px-4">
//         <ChatInput onSend={(input)=>callApi(input)} disabled={loading}/>
//       </div>

//       <div className="mt-10 px-4">
//         {messages.map((msg:MessageProps)=>(
//           <ChatMessage key={msg.key} text={msg.text} from={msg.from}/>
//         ))}
//         {messages.length==0 && <p className="text-center text-gray-400">I am at your service</p>}
//       </div>
//       </main>
//   )
// }