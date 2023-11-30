import {
  faMessage,
  faPlus,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useEffect, useState } from "react";

export const ChatSidebar = ({ chatId }) => {
  const [chatList, setChatList] = useState([]);

  useEffect(() => {
    const loadChatList = async () => {
      const response = await fetch(`/api/chat/getChatList`, {
        method: "POST",
      });
      const json = await response.json();
      console.log("CHAT LIST: ", json);
      setChatList(json?.chats || []);
    };
    loadChatList();
  }, [chatId]);

  return (
    <div className="flex flex-col overflow-hidden bg-gray-900 text-white">
      <Link
        href="/chat"
        className="m-2 flex items-center gap-4 rounded-md p-2 hover:bg-gray-800 bg-emerald-500 hover:bg-emerald-600"
      >
        <FontAwesomeIcon icon={faPlus} /> New chat
      </Link>
      <div className="flex-1 overflow-auto bg-gray-950  hover:bg-gray-800 bg-emerald-500 hover:bg-emerald-100 ">
        {chatList.map((chat) => (
          <Link
            key={chat._id}
            href={`/chat/${chat._id}`}
            className={`m-2 flex items-center gap-4 rounded-md p-2 hover:bg-gray-800 ${
              chatId === chat._id ? "bg-gray-700 hover:bg-gray-700" : ""
            }`}
          >
            <FontAwesomeIcon icon={faMessage} className="text-black/50" />{" "}
            <span
              title={chat.title}
              className="overflow-hidden text-ellipsis whitespace-nowrap"
            >
              {chat.title}
            </span>
          </Link>
        ))}
      </div>
      <Link href="/api/auth/logout" className="m-2 flex items-center gap-4 rounded-md p-2 hover:bg-gray-800 bg-emerald-500 hover:bg-emerald-600">
        <FontAwesomeIcon icon={faRightFromBracket} /> Logout
      </Link>
    </div>
  );
};