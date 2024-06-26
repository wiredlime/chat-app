import ChatList, { ActiveChat } from "@/components/chat-list";

import { getFriendsByUserId } from "@/helpers/get-friends-by-user-id";
import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { chatHrefConstructor } from "@/lib/utils";
import { Message } from "@/lib/validations/message";

import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import React, { ReactNode } from "react";

type LayoutProps = {
  children: ReactNode;
};

export default async function Layout({ children }: LayoutProps) {
  const session = await getServerSession(authOptions);
  const friends = await getFriendsByUserId(session?.user.id || "");

  if (!session) notFound();

  const friendsWithLastMessage: ActiveChat[] = await Promise.all(
    friends.map(async (friend) => {
      const [lastMessageRaw] = (await fetchRedis(
        "zrange",
        `chat:${chatHrefConstructor(session?.user.id, friend.id)}:messages`,
        -1,
        -1
      )) as string[];

      if (lastMessageRaw) {
        const lastMessage = JSON.parse(lastMessageRaw) as Message;
        return {
          ...friend,
          lastMessage,
        };
      } else {
        return { ...friend };
      }
    })
  );

  return (
    <div className=" h-full grid grid-cols-[4fr_8fr]">
      <div className="h-full border-r">
        <ChatList
          friends={friends}
          activeChats={friendsWithLastMessage}
          sessionId={session?.user.id || ""}
        />
      </div>
      {children}
    </div>
  );
}
