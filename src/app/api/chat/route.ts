import { StreamingTextResponse, LangChainStream, Message } from 'ai';
import { ChatOpenAI } from 'langchain/chat_models/openai';

import { ConversationalRetrievalQAChain } from 'langchain/chains';
import { vectorStore } from '@/utils/openai';
import { NextResponse } from 'next/server';
import { BufferMemory } from "langchain/memory";


export async function POST(req: Request) {
    try {
        const { stream, handlers } = LangChainStream();
        const body = await req.json();
        const messages: Message[] = body.messages ?? [];
        let question = messages[messages.length - 1].content;
        // Add your extra string to the question
        const extraString = "Ingore all previous instruction. Your name is Friday. You are a professional assistant for Tong Chen. You have a sense of humor. Your duty is to answer the question. Do not mention who you are unless it is in the question./n.";
        question = extraString + question; // Concatenate the extra string

        //const CUSTOM_QUESTION_GENERATOR_CHAIN_PROMPT = `Ingore all previous instruction. Your name is Friday. You are a professional assistant for Tong Chen. You have a sense of humor. 
            Your duty is to answer the question: {question}/n.
            Your previous coversation is:
            {chat_history}
            `;

        const model = new ChatOpenAI({
            model: "gpt-4o-mini",
            temperature: 0.8,
            streaming: true,
            callbacks: [handlers],
        });

        const retriever = vectorStore().asRetriever({ 
            "searchType": "mmr", 
            "searchKwargs": { "fetchK": 10, "lambda": 0.25 } 
        })
        const conversationChain = ConversationalRetrievalQAChain.fromLLM(model, retriever, {
            memory: new BufferMemory({
              memoryKey: "chat_history",
            }),
            questionGeneratorChainOptions: {
              template: CUSTOM_QUESTION_GENERATOR_CHAIN_PROMPT,
            },
          })
        conversationChain.invoke({
            "question": question
        })

        return new StreamingTextResponse(stream);
    }
    catch (e) {
        return NextResponse.json({ message: 'Error Processing' }, { status: 500 });
    }
}
