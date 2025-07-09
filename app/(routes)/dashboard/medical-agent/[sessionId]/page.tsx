"use client";

import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { doctorAgent } from "../../_components/DoctorAgentCard";
import { Circle, Loader, PhoneCall, PhoneOff } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Vapi from "@vapi-ai/web";
import { toast } from "sonner";

interface VapiWithListeners extends Vapi {
  _callStartListener?: () => void;
  _callEndListener?: () => void;
  _messageListener?: (message: any) => void;
}

export type SessionDetail = {
  id: number;
  notes: string;
  sessionId: string;
  report: JSON;
  selectedDoctor: doctorAgent;
  createdOn: string;
};

type messages = {
  role: string;
  text: string;
};

function MedicalVoiceAgent() {
  const { sessionId } = useParams();
  const [sessionDetail, setSessionDetail] = useState<SessionDetail>();
  const [callStarted, setCallStarted] = useState(false);
  const [vapiInstance, setVapiInstance] = useState<any>();
  const [currentRole, setCurrentRole] = useState<string | null>();
  const [liveTranscript, setLiveTranscript] = useState<string>();
  const [messages, setMessages] = useState<messages[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    sessionId && GetSessionDetails();
  }, [sessionId]);

  const GetSessionDetails = async () => {
    const result = await axios.get("/api/session-chat?sessionId=" + sessionId);
    console.log(result.data);
    setSessionDetail(result.data);
  };

  // const StartCall = () => {
  //   const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_API_KEY!);
  //   setVapiInstance(vapi);
  //   vapi.start(process.env.NEXT_PUBLIC_VAPI_VOICE_ASSISTANT_ID);
  //   vapi.on("call-start", () => {
  //     console.log("Call started");
  //     setCallStarted(true);
  //   });
  //   vapi.on("call-end", () => {
  //     console.log("Call ended");
  //     setCallStarted(false);
  //   });
  //   vapi.on("message", (message) => {
  //     if (message.type === "transcript") {
  //       console.log(`${message.role}: ${message.transcript}`);
  //     }
  //   });
  // };

  // const endCall = () => {
  //   if (!vapiInstance) return;
  //   console.log("Ending Call....");
  //   //Stop the call
  //   vapiInstance.stop();

  //   vapiInstance.off("call-start");
  //   vapiInstance.off("call-end");
  //   vapiInstance.off("message");

  //   setCallStarted(false);
  //   setVapiInstance(null);
  // };

  const StartCall = () => {
    const vapi = new Vapi(
      process.env.NEXT_PUBLIC_VAPI_API_KEY!
    ) as VapiWithListeners;
    setVapiInstance(vapi);

    const handleCallStart = () => {
      console.log("Call started");
      setCallStarted(true);
    };

    const handleCallEnd = () => {
      console.log("Call ended");
      setCallStarted(false);
    };

    const handleMessage = (message: any) => {
      if (message.type === "transcript") {
        const { role, transcriptType, transcript } = message;
        console.log(`${message.role}: ${message.transcript}`);
        if (transcriptType == "partial") {
          setLiveTranscript(transcript);
          setCurrentRole(role);
        } else if (transcriptType == "final") {
          //Final Transcript
          setMessages((prev: any) => [
            ...prev,
            { role: role, text: transcript },
          ]);
          setLiveTranscript("");
          setCurrentRole(null);
        }
      }
    };

    const VapiAgentConfig = {
      name: "AI Medical Doctor Voice Agent",
      firstMessage:
        "Hi there! I am your Medical AI Assistant. I am here to help you with any health questions or concerns you might have today. How are you feeling?",
      transcriber: {
        provider: "assembly-ai",
        language: "en",
      },
      voice: {
        provider: "playht",
        voiceId: sessionDetail?.selectedDoctor?.voiceId,
      },
      model: {
        provider: "openai",
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: sessionDetail?.selectedDoctor?.agentPrompt,
          },
        ],
      },
    };

    vapi.on("speech-start", () => {
      console.log("Assistant started speaking");
      setCurrentRole("assistant");
    });
    vapi.on("speech-end", () => {
      console.log("Assistant stopped speaking");
      setCurrentRole("user");
    });

    // Store for removal
    vapi._callStartListener = handleCallStart;
    vapi._callEndListener = handleCallEnd;
    vapi._messageListener = handleMessage;

    vapi.on("call-start", handleCallStart);
    vapi.on("call-end", handleCallEnd);
    vapi.on("message", handleMessage);

    //@ts-ignore
    vapi.start(VapiAgentConfig);
  };

  const endCall = async () => {
    const result = await GenerateReport();

    if (!vapiInstance) return;

    console.log("Ending Call....");
    vapiInstance.stop();

    const vapi = vapiInstance as VapiWithListeners;

    if (vapi._callStartListener) {
      vapi.off("call-start", vapi._callStartListener);
    }

    if (vapi._callEndListener) {
      vapi.off("call-end", vapi._callEndListener);
    }

    if (vapi._messageListener) {
      vapi.off("message", vapi._messageListener);
    }

    setCallStarted(false);
    setVapiInstance(null);

    toast.success("Your report is generated!");
    router.replace("/dashboard");
  };

  const GenerateReport = async () => {
    const result = await axios.post("/api/medical-report", {
      messages: messages,
      sessionDetail: sessionDetail,
      sessionId: sessionId,
    });

    console.log(result.data);
    return result.data;
  };

  return (
    <div className="p-5 border rounded-3xl bg-secondary">
      <div className="flex justify-between items-center">
        <h2 className="p-1 px-2 border rounded-md flex gap-2 items-center">
          {" "}
          <Circle
            className={`h-4 w-4 rounded-full ${
              callStarted ? "bg-green-500" : "bg-red-500"
            }`}
          />
          {callStarted ? "Connected..." : "Not Connected"}
        </h2>
        <h2 className="font-bold text-xl text-gray-400"> 00: 00</h2>
      </div>

      {sessionDetail && (
        <div className="flex items-center flex-col mt-10">
          <Image
            src={sessionDetail?.selectedDoctor?.image}
            alt={sessionDetail?.selectedDoctor?.specialist}
            width={120}
            height={120}
            className="h-[100px] w-[100px] object-cover rounded-full"
            priority
          />
          <h2 className="mt-2 text-lg">
            {sessionDetail?.selectedDoctor?.specialist}
          </h2>
          <p className="text-sm text-gray-400"> AI Medical Voice Agent</p>

          <div className="mt-12 overflow-y-auto flex flex-col items-center px-10 md:px-28 lg:px-52 xl:px-72">
            {messages?.slice(-4).map((msg: messages, index) => (
              <h2 className="text-gray-400 p-2" key={index}>
                {msg.role} : {msg.text}{" "}
              </h2>
            ))}
            {liveTranscript && liveTranscript?.length > 0 && (
              <h2 className="text-lg">
                {currentRole} : {liveTranscript}
              </h2>
            )}
          </div>

          {!callStarted ? (
            <Button className="mt-20" onClick={StartCall} disabled={loading}>
              {loading ? <Loader className="animate-spin" /> : <PhoneCall />}{" "}
              Start Call
            </Button>
          ) : (
            <Button
              variant={"destructive"}
              onClick={endCall}
              disabled={loading}
            >
              {loading ? <Loader className="animate-spin" /> : <PhoneOff />}
              Disconnect
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default MedicalVoiceAgent;
