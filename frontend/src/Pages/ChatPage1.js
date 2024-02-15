// import React, { useEffect, useState } from 'react'
// // import axios from 'axios'
// // import { error } from 'console';

// const ChatPage = () => {
//     const [chats,setChats] =useState([]);
//     useEffect(()=>{
//         fetch("http://localhost:3000/chats")
//         .then(res=>res.json())
//         .then(data => setChats(data))
//         .catch(err => console.log(err))


//     },[]);
//   return (

//     <div className='App'>
//       <div className="chat">
//         {chats && chats.map((chat) =>(
//           <p key={chat._id}>{chat.chatName}</p>
//         ))}
//       </div>

//       Chatpage is live  
      
      
      
//     </div>
//   )
// }

// export default ChatPage