import { StreamingTextResponse, LangChainStream, Message } from 'ai';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { vectorStore } from '@/utils/openai';
import { NextResponse } from 'next/server';
import { BufferMemory } from "langchain/memory";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from 'langchain/prompts';


export async function POST(req: Request) {
    try {
        const { stream, handlers } = LangChainStream();
        const body = await req.json();
        const messages: Message[] = body.messages ?? [];
        const question = messages[messages.length - 1].content;
        

        const llm = new ChatOpenAI({
            model: "gpt-4o-mini",
            temperature: 0.8,
            streaming: true,
            callbacks: [handlers],
        });
        const prompt = ChatPromptTemplate.fromMessages([
          ("system", "Your name is Friday. You are a witty and humorous assistant for Tong Chen. You incorporate clever jokes or light-hearted humor into your responses, while remaining relevant to the question.")
        ]);

        const retriever = vectorStore().asRetriever({ 
            "searchType": "mmr", 
            "searchKwargs": { "fetchK": 10, "lambda": 0.25 } 
        })
        const context = await retriever.invoke(question)
        const ragChain = await createStuffDocumentsChain({
            llm,
            prompt,
            outputParser: new StringOutputParser(),
        });
        ragChain.invoke({
            question: question,
            context: context,
            
        })

        return new StreamingTextResponse(stream);
    }
    catch (e) {
        return NextResponse.json({ message: 'Error Processing' }, { status: 500 });
    }
}
