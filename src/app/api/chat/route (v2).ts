import { StreamingTextResponse, LangChainStream, Message } from 'ai';
//import { streamText, LangChainStream, Message } from 'ai';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import {
  RunnableSequence,
  RunnablePassthrough,
} from "@langchain/core/runnables";
import { vectorStore } from '@/utils/openai';
import { NextResponse } from 'next/server';
import { BufferMemory } from 'langchain/memory';
import { ChatPromptTemplate, MessagesPlaceholder } from 'langchain/prompts';
import { SystemMessagePromptTemplate, HumanMessagePromptTemplate } from 'langchain/prompts';
import { StringOutputParser } from "@langchain/core/output_parsers";



export async function POST(req: Request) {
    try {
        const { stream, handlers } = LangChainStream();
        const body = await req.json();
        const messages: Message[] = body.messages ?? [];
        const question = messages[messages.length - 1].content;
        
        const llm = new ChatOpenAI({
            temperature: 0.8,
            streaming: true,
            callbacks: [handlers],
        });

        const retriever = vectorStore().asRetriever({ 
            "searchType": "mmr", 
            "searchKwargs": { "fetchK": 10, "lambda": 0.25 } 
        })

        // Set up memory
        const memory = new BufferMemory({
            memoryKey: "chat_history", // Key for storing conversation history
            returnMessages: true, // Keeps track of past conversation as messages
        });

        const prompt = ChatPromptTemplate.fromPromptMessages([
            SystemMessagePromptTemplate.fromTemplate(
                "Your name is Friday. You are a witty and humorous assistant for Tong Chen. You incorporate clever jokes or light-hearted humor into your responses. Use the provided documents and prior chat history to answer the user's question."
            ),
            // new MessagesPlaceholder("chat_history"), // Placeholder for conversation history
            HumanMessagePromptTemplate.fromTemplate("Context: {context}\nQuestion: {question}"), // User's question
        ]);

        // Create the RetrievalQA chain
        const qaChain = RunnableSequence.from([
              {
                context: retriever,
                question: new RunnablePassthrough(),
              },
              prompt,
              llm,
              new StringOutputParser(),
        ]);
        const context = retriever.invoke(question)

        // Invoke the chain with the user's question
        const response = await qaChain.invoke({
            question: question,
            context: context,
        });

        return new StreamingTextResponse(stream);
    }
    catch (e) {
        return NextResponse.json({ message: 'Error Processing' }, { status: 500 });
    }
}
