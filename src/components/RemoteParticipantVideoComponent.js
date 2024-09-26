import { useEffect, useState, useRef } from 'react';

export default function RemoteParticipantVideoComponent({videoTrack, streamIdProp}){
    const videoRef = useRef(null);
    const [videoStream, setVideoStream] = useState(null);
    const [streamId, setStreamId] = useState("")

    useEffect(() => {

        if(videoTrack){

            const newStream = new MediaStream();
            newStream.addTrack(videoTrack);
            videoRef.current.srcObject = newStream
            setVideoStream(newStream);
        }
        
    }, [videoTrack])

    useEffect(() => {

      setStreamId(streamIdProp)

    }, [streamIdProp])


    return(
        <div style={{display:"flex", flexDirection:"column", alignItems:"center"}}>
            <video ref={videoRef} id="remoteVideo" style={{width:"360", height:"202px"}} controls autoPlay playsInline></video>
            <span>{streamId}</span>
        </div>
    )
}