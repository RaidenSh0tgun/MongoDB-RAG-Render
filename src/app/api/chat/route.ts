import { StreamingTextResponse, LangChainStream, Message } from 'ai';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { vectorStore } from '@/utils/openai';
import { NextResponse } from 'next/server';
import { BufferMemory } from "langchain/memory";
import { StringOutputParser } from "@langchain/core/output_parsers";


export async function POST(req: Request) {
    try {
        const { stream, handlers } = LangChainStream();
        const body = await req.json();
        const messages: Message[] = body.messages ?? [];
        const question = messages[messages.length - 1].content;

        const model = new ChatOpenAI({
            model: "gpt-4o-mini",
            temperature: 0.8,
            streaming: true,
            callbacks: [handlers],
        });
        const systemMessage = "Your name is Friday. You are a witty and humorous assistant for Tong Chen. You incorporate clever jokes or light-hearted humor into your responses, while remaining relevant to the question.";
        const retriever = vectorStore().asRetriever({ 
            "searchType": "mmr", 
            "searchKwargs": { "fetchK": 10, "lambda": 0.25 } 
        })
        const ragChain = await createStuffDocumentsChain({
            model,
            systemMessage,
            outputParser: new StringOutputParser(),
        });
        ragChain.invoke({
            question:: question,
            
        })

        return new StreamingTextResponse(stream);
    }
    catch (e) {
        return NextResponse.json({ message: 'Error Processing' }, { status: 500 });
    }
}
