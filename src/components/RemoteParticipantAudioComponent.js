import { useEffect, useState, useRef } from 'react';

export default function RemoteParticipantAudioComponent({audioTrack}){
    const videoRef = useRef(null);
    const [videoStream, setVideoStream] = useState(null);

    useEffect(() => {
        if(audioTrack){
            const newStream = new MediaStream();
            newStream.addTrack(audioTrack);
            videoRef.current.srcObject = newStream
            setVideoStream(newStream);
        }
        
    }, [audioTrack])

    return(
        <div style={{display:"none"}}>
            <video ref={videoRef} id="remoteVideo" controls autoPlay playsInline></video>
        </div>
    )
}