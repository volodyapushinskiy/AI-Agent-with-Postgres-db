import React, { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";

interface InputBarProps {
  currentMessage: string;
  setCurrentMessage: Dispatch<SetStateAction<string>>;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void | Promise<void>;
}

const InputBar = ({
  currentMessage,
  setCurrentMessage,
  onSubmit,
}: InputBarProps) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCurrentMessage(e.target.value);
  };

  return (
    <form onSubmit={onSubmit} className="p-4 bg-white">
      <div className="flex items-center bg-[#F9F9F5] rounded-full p-3 shadow-md border border-gray-200">
        <button
          type="button"
          className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>

        <input
          type="text"
          placeholder="Type a message"
          value={currentMessage}
          onChange={handleChange}
          className="flex-grow px-4 py-2 bg-transparent focus:outline-none text-gray-700"
        />

        <button
          type="button"
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all duration-200"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
        </button>

        <button
          type="submit"
          className="bg-[#229ED9] hover:bg-[#1d8fc4] rounded-full p-3 ml-2 shadow-md transition-all duration-200 group"
        >
          <svg
            className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-200"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M21.426 2.574a1 1 0 0 0-1.03-.242l-17 6a1 1 0 0 0 .08 1.907l6.72 1.92 1.92 6.72a1 1 0 0 0 .88.72h.066a1 1 0 0 0 .899-.574l6-17a1 1 0 0 0-.535-1.251Zm-8.33 14.12-1.273-4.455 5.92-5.92-7.647 10.375Z" />
          </svg>
        </button>
      </div>
    </form>
  );
};

export default InputBar;