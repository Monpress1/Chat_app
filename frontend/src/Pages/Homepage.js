import io from 'socket.io-client';
import React, { useState } from 'react';
import ChatPage3 from './ChatPage3';


const socket = io.connect("https://sserver-hvw5.onrender.com/");
const Homepage = () => {

  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [showChatRoom, setChatRoom] = useState(false);


  


  const joinRoom = (e) => {
    e.preventDefault();
    if(username !== "" &&  room !== ""){

      socket.emit("join_room", room);
      setChatRoom(true);
    }
     
  }


  return (
    <div>
      {!showChatRoom ?(
      <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img className="mx-auto h-10 w-auto" src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600" alt="Your Company" />
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">Join Chat</h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6" action="#" >
          <div>
            <div className='flex items-center justify-between'>
              <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">Name</label>
            </div>
            <div className="mt-2">
              <input id="name" name="name" type="text" autoComplete="text" placeholder='Aman...' onChange={(event)=>{setUsername(event.target.value)}} required className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="roomid" className="block text-sm font-medium leading-6 text-gray-900">Room ID</label>

            </div>
            <div className="mt-2">
              <input id="roomid" name="roomid" type="text" autoComplete="roomid" placeholder='Room ID...' onChange={(event)=>{setRoom(event.target.value)}} required className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
            </div>
          </div>

          <div>
            <button  onClick={joinRoom}  className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Join A Room</button>
          </div>
         
        </form>

      
      </div>
    </div>)
    :(
    <ChatPage3 socket={socket} username={username} room={room}/>
    )}
    </div>
  )
}

export default Homepage
