import { useEffect, useState, useRef } from 'react';
import { WebRTCAdaptor } from '@antmedia/webrtc_adaptor'

import RemoteParticipantAudioComponent from './RemoteParticipantAudioComponent';
import RemoteParticipantVideoComponent from './RemoteParticipantVideoComponent';


export default function ConferenceComponent(){
    
    const [localParticipantStreamId, setLocalParticipantStreamId] = useState('')
    const [roomId, setRoomId] = useState('')
    const localVideoElement = useRef(null)
    const mediaConstraints = useRef( {
        video: { width: { min: 176, max: 360 } }, 
        audio: true, 
      }
    )
    const websocketUrl = useRef('wss://test.antmedia.io:5443/LiveApp/websocket')
    const localParticipantVideoElementId = useRef('localParticipantVideo')
    const webrtcAdaptor = useRef(null)
    const allParticipants = useRef({})
    const [remoteParticipantTracks, setRemoteParticipantTracks] = useState([]) 
    const videoTrackAssignmentList = useRef([])
    const remoteParticipantTracksRef = useRef(remoteParticipantTracks);
    const streamIdVideoTrackMatcherInterval = useRef(null)

    useEffect(() => {

        webrtcAdaptor.current = new WebRTCAdaptor({
            websocket_url: websocketUrl.current,
            mediaConstraints: mediaConstraints.current,
            localVideoId: localParticipantVideoElementId.current,
            localVideoElement: localVideoElement.current,
            isPlayMode: false,
            onlyDataChannel: false,
            debug: true,
            callback: (info, obj) => {
              if (info === "initialized") {
                console.log("Webrc adaptor initialized.");
              } else if (info === "broadcastObject") {
                if (obj.broadcast === undefined) {
                  return;
                }
            let broadcastObject = JSON.parse(obj.broadcast);
            if (obj.streamId === roomId) {
                handleMainTrackBroadcastObject(broadcastObject)
            } else {
                handleSubTrackBroadcastObject(broadcastObject)
            }
            console.log(obj.broadcast);
            } else if (info === "newTrackAvailable") {
                console.log("new track available!")
                onNewTrack(obj)
            } else if (info === "publish_started") {
                console.log("publish started to room " + roomId);
            } else if (info === "publish_finished") {
            console.log("publish finished");
            } else if (info === "play_started") {
            console.log("PLAY STARTED")
            webrtcAdaptor.current.getBroadcastObject(roomId);
            } else if (info === "play_finished") {
            //this event is fired when room is finished to play
            console.log("play_finished for stream:" + obj.streamId);
            
            } else if (info === "data_received") {
                handleNotificationEvent(obj)
            }
            },
          });

        streamIdVideoTrackMatcherInterval.current = setInterval(() => matchStreamIdsAndVideoTracks(), 50);

    },[])


    useEffect(() => {
        remoteParticipantTracksRef.current = remoteParticipantTracks;

      }, [remoteParticipantTracks]);


    const matchStreamIdsAndVideoTracks = () => {
        // Create a new array to store the updated tracks
        const updatedTracks = [];
      
        // Loop through each track
        remoteParticipantTracksRef.current.forEach((track) => {
          let matchingAssignmentFound = false;
            console.log(track)
          // Loop through each assignment to find a match manually
          for (const assignment of videoTrackAssignmentList.current) {
            if (assignment.videoLabel === track.trackId) {
              // Push a modified version of the track with the updated streamId
              updatedTracks.push({
                ...track, // Spread the existing track properties
                trackId: assignment.trackId // Update the streamId
              });
              matchingAssignmentFound = true;
            }
          }
      
          // If no matching assignment is found, keep the track unchanged
          if (!matchingAssignmentFound) {
            updatedTracks.push(track);
          }
        });
      
        setRemoteParticipantTracks(updatedTracks);
      };

    const getUserStatusMetaData = ()=>{
        let metadata = {
            isMicMuted: false,
            isCameraOff: false,
        }
        return metadata;
    }

    const leaveRoom = () => {
		allParticipants.current = {};
		webrtcAdaptor.current.stop(localParticipantStreamId);
		webrtcAdaptor.current.stop(roomId);
	
		setRemoteParticipantTracks([])
	}
  
    const handleNotificationEvent = (data) => {
		var notificationEvent = JSON.parse(data.data);
        console.log(notificationEvent)
		if (notificationEvent != null && typeof (notificationEvent) == "object") {
			var eventStreamId = notificationEvent.streamId;
			var eventType = notificationEvent.eventType;

			if (eventType != "UPDATE_SOUND_LEVEL") {
				console.log("Received data : ", data.data);
			}

			if (eventType === "CAM_TURNED_OFF") {
				console.log("Camera turned off for : ", eventStreamId);
				webrtcAdaptor.current.getBroadcastObject(roomId);
			} else if (eventType === "CAM_TURNED_ON") {
				console.log("Camera turned on for : ", eventStreamId);
				webrtcAdaptor.current.webrtcAdaptor.getBroadcastObject(roomId);
			} else if (eventType === "MIC_MUTED") {
				console.log("Microphone muted for : ", eventStreamId);
				webrtcAdaptor.current.webrtcAdaptor.getBroadcastObject(roomId);
			} else if (eventType === "MIC_UNMUTED") {
				console.log("Microphone unmuted for : ", eventStreamId);
				webrtcAdaptor.current.webrtcAdaptor.getBroadcastObject(roomId);
			} else if (eventType === "CHAT_MESSAGE") {

            } else if (eventType === "TRACK_LIST_UPDATED") {

				webrtcAdaptor.current.getBroadcastObject(roomId);
			} else if (eventType === "UPDATE_SOUND_LEVEL") {

            } else if(eventType === "VIDEO_TRACK_ASSIGNMENT_LIST"){
                console.log("VIDEO TRACK ASSIGNMENT LIST CAME!")

                videoTrackAssignmentList.current = notificationEvent.payload
          
            }
		} else {
			console.log("Received data : ", data.data);
		}
	}


    const onNewTrack = (obj) => {

		//In multitrack conferencing the stream is same, tracks are being and remove from the stream
		console.log("new track available with id: "
				+ obj.trackId + " and kind: " + obj.track.kind + " on the room:" + roomId);

        console.log(obj)

		//trackId is ARDAMSv+STREAM_ID or  ARDAMSa+STREAM_ID
		var incomingTrackId = obj.trackId.substring("ARDAMSx".length);

		if (incomingTrackId === roomId || incomingTrackId === localParticipantStreamId) {
			return;
		}

        var remoteParticipantTrack = {
            trackId: incomingTrackId,
            track: obj.track,
            kind : obj.track.kind             
        }
        
         // Check if the track already exists
        const trackExists = remoteParticipantTracks.some(
        (participantTrack) => participantTrack.trackId === remoteParticipantTrack.trackId
         );
  
        if (!trackExists) {
        // Add the new track to the state
        setRemoteParticipantTracks((prevTracks) => [...prevTracks, remoteParticipantTrack]);
        }
        console.log(remoteParticipantTracks)

		obj.stream.onremovetrack = (event) => {
			console.log("track is removed with id: " + event.track.id)
			console.log(event);
			var removedTrackId = event.track.id.substring("ARDAMSx".length);
            setRemoteParticipantTracks((prevTracks) => 
                prevTracks.filter((participantTrack) => participantTrack.trackId !== removedTrackId)
              );
		}

	} 

    
    const handleSubTrackBroadcastObject = (broadcastObject) => {

		if (broadcastObject.metaData !== undefined && broadcastObject.metaData !== null) {
			let userStatusMetadata = JSON.parse(broadcastObject.metaData);

			if (userStatusMetadata.isCameraOff !== undefined) {
				broadcastObject.isCameraOff = userStatusMetadata.isCameraOff;
			}

			if (userStatusMetadata.isMicMuted !== undefined) {
				broadcastObject.isMicMuted = userStatusMetadata.isMicMuted;
			}
		}

		allParticipants.current[broadcastObject.streamId] = broadcastObject;
	}

    const joinRoom = () => {
        var userStatusMetaData = getUserStatusMetaData()
        webrtcAdaptor.current.publish(localParticipantStreamId, null, null, null, localParticipantStreamId, roomId, JSON.stringify(userStatusMetaData));
        webrtcAdaptor.current.play(roomId)
    }

    const renderRemoteParticipantTracks = () => {
        return remoteParticipantTracks.map((trackObj) => {
          if (trackObj.kind === 'video') {
            return (
              <RemoteParticipantVideoComponent
                key={trackObj.trackId}
                videoTrack={trackObj.track}
                streamIdProp={trackObj.trackId}
              />
            );
          } else if (trackObj.kind === 'audio') {
            return (
              <RemoteParticipantAudioComponent
                key={trackObj.trackId}
                audioTrack={trackObj.track}
              />
            );
          } else {
            return null; 
          }
        });
      };
    const handleMainTrackBroadcastObject = (broadcastObject) => {
        let participantIds = broadcastObject.subTrackStreamIds;
    
        //find and remove not available tracks
        let currentTracks = Object.keys(allParticipants.current);
        currentTracks.forEach(trackId => {
            if (!allParticipants.current[trackId].isFake && !participantIds.includes(trackId)) {
                console.log("stream removed:" + trackId);
    
                delete allParticipants.current[trackId];
            }
        });
    
        //request broadcast object for new tracks
        participantIds.forEach(pid => {
            if (allParticipants[pid] === undefined) {
                webrtcAdaptor.current.getBroadcastObject(pid);
            }
        });
    }

    return(
        <div style={{width:"100%", height:"100%", display:"flex", flexDirection:"column"}}>
            <h1 style={{marginLeft:"auto", marginRight:"auto"}}>Ant Media React Conference Sample</h1>

            <div style={{display:"flex"}}>
            <video  muted={true} autoPlay={true} style={{width:"360", height:"202px"}} ref={localVideoElement.current} id={localParticipantVideoElementId.current}></video>
            {renderRemoteParticipantTracks()}
            </div>
            
            <div style={{display:"flex", flexDirection:"row", alignItems:"center", justifyContent:"center"}}>
                <div style={{display:"flex", flexDirection:"column"}}>
                <input 
               type="text"
               placeholder="Enter Room ID"
               value={roomId}
               onChange={(e) => setRoomId(e.target.value)}    
            ></input>
              <input 
               type="text"
               placeholder="Enter Your Stream ID"
               value={localParticipantStreamId}
               onChange={(e) => setLocalParticipantStreamId(e.target.value)}    
            ></input>

                </div>
          
            <div style={{display:"flex"}}>
            <button onClick={joinRoom}>Join Room</button>
            <button onClick={leaveRoom}>Leave Room</button>

            </div>

            </div>    

        </div>
    )

}

