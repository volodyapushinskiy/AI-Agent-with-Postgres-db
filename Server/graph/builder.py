from typing import TypedDict, Annotated

from langgraph.graph import add_messages, StateGraph, END
from langchain_core.messages import AnyMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_groq import ChatGroq


class State(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]


search_tool = TavilySearchResults(max_results=3)
tools = [search_tool]

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0,
    streaming=True,
)

llm_with_tools = llm.bind_tools(tools=tools)


async def model_node(state: State, config: RunnableConfig):
    result = await llm_with_tools.ainvoke(state["messages"], config=config)
    return {"messages": [result]}


async def tools_router(state: State):
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and len(last_message.tool_calls) > 0:
        return "tool_node"
    return END


async def tool_node(state: State, config: RunnableConfig):
    tool_calls = state["messages"][-1].tool_calls
    tool_messages = []

    for tool_call in tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]
        tool_id = tool_call["id"]

        if tool_name == "tavily_search_results_json":
            search_results = await search_tool.ainvoke(tool_args, config=config)
            tool_messages.append(
                ToolMessage(
                    content=str(search_results),
                    tool_call_id=tool_id,
                    name=tool_name,
                )
            )

    return {"messages": tool_messages}


def create_graph_builder() -> StateGraph:
    graph_builder = StateGraph(State)
    graph_builder.add_node("model", model_node)
    graph_builder.add_node("tool_node", tool_node)
    graph_builder.set_entry_point("model")
    graph_builder.add_conditional_edges("model", tools_router)
    graph_builder.add_edge("tool_node", "model")
    return graph_builder