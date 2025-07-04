// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DecentraSpace MVP with Live Rooms
 * @dev Ultra-fast creator platform with live streaming capabilities
 */
contract DecentraSpaceMVP {
    // ============ CUSTOM ERRORS ============
    error AlreadyRegistered();
    error NotRegistered();
    error InvalidInput();
    error InsufficientTip();
    error CannotTipYourself();
    error RoomNotFound();
    error RoomNotLive();

    // ============ STRUCTS ============
    struct Creator {
        string name;
        string description;
        uint256 totalEarnings;
        uint256 contentCount;
        uint256 liveRoomCount;
        uint256 createdAt;
    }

    struct Content {
        string id;
        address creator;
        string title;
        string cid;
        uint256 timestamp;
        uint256 tipsReceived;
        uint256 views;
    }

    struct LiveRoom {
        string id;
        address creator;
        string title;
        string description;
        string huddleLink;      // Join link for the room
        uint256 createdAt;
        uint256 participantCount;
        bool isLive;
    }

    // ============ STATE VARIABLES ============
    mapping(address => Creator) public creators;
    mapping(string => Content) public contents;
    mapping(string => LiveRoom) public liveRooms;
    mapping(address => string[]) public creatorContents;
    mapping(address => string[]) public creatorLiveRooms;
    
    address[] public allCreators;
    string[] public allContent;
    string[] public allLiveRooms;
    
    uint256 public contentCounter;
    uint256 public liveRoomCounter;
    uint256 public totalCreators;
    uint256 public totalTips;

    // ============ EVENTS ============
    event CreatorRegistered(address indexed creator, string name);
    event ContentUploaded(address indexed creator, string indexed contentId, string title);
    event LiveRoomCreated(address indexed creator, string indexed roomId, string title);
    event LiveRoomStatusChanged(string indexed roomId, bool isLive);
    event ParticipantJoined(string indexed roomId, address participant);
    event TipSent(address indexed sender, address indexed recipient, uint256 amount);

    // ============ CREATOR FUNCTIONS ============
    
    /**
     * @dev Register as creator - MVP version
     */
    function registerCreator(string memory name, string memory description) external {
        if (bytes(name).length == 0) revert InvalidInput();
        if (bytes(creators[msg.sender].name).length > 0) revert AlreadyRegistered();
        
        creators[msg.sender] = Creator({
            name: name,
            description: description,
            totalEarnings: 0,
            contentCount: 0,
            liveRoomCount: 0,
            createdAt: block.timestamp
        });
        
        allCreators.push(msg.sender);
        totalCreators++;
        
        emit CreatorRegistered(msg.sender, name);
    }

    /**
     * @dev Update creator profile
     */
    function updateCreator(string memory name, string memory description) external {
        if (bytes(creators[msg.sender].name).length == 0) revert NotRegistered();
        if (bytes(name).length == 0) revert InvalidInput();
        
        creators[msg.sender].name = name;
        creators[msg.sender].description = description;
    }

    // ============ CONTENT FUNCTIONS ============

    /**
     * @dev Upload content - MVP version
     */
    function uploadContent(string memory title, string memory cid) external {
        if (bytes(creators[msg.sender].name).length == 0) revert NotRegistered();
        if (bytes(title).length == 0 || bytes(cid).length == 0) revert InvalidInput();
        
        contentCounter++;
        string memory contentId = string(abi.encodePacked("content_", _toString(contentCounter)));
        
        contents[contentId] = Content({
            id: contentId,
            creator: msg.sender,
            title: title,
            cid: cid,
            timestamp: block.timestamp,
            tipsReceived: 0,
            views: 0
        });
        
        creatorContents[msg.sender].push(contentId);
        allContent.push(contentId);
        creators[msg.sender].contentCount++;
        
        emit ContentUploaded(msg.sender, contentId, title);
    }

    /**
     * @dev View content (increment view count)
     */
    function viewContent(string memory contentId) external {
        if (bytes(contents[contentId].id).length > 0) {
            contents[contentId].views++;
        }
    }

    // ============ LIVE ROOM FUNCTIONS ============

    /**
     * @dev Create live room
     */
    function createLiveRoom(
        string memory title,
        string memory description,
        string memory huddleLink
    ) external {
        if (bytes(creators[msg.sender].name).length == 0) revert NotRegistered();
        if (bytes(title).length == 0 || bytes(huddleLink).length == 0) revert InvalidInput();
        
        liveRoomCounter++;
        string memory roomId = string(abi.encodePacked("room_", _toString(liveRoomCounter)));
        
        liveRooms[roomId] = LiveRoom({
            id: roomId,
            creator: msg.sender,
            title: title,
            description: description,
            huddleLink: huddleLink,
            createdAt: block.timestamp,
            participantCount: 0,
            isLive: true
        });
        
        creatorLiveRooms[msg.sender].push(roomId);
        allLiveRooms.push(roomId);
        creators[msg.sender].liveRoomCount++;
        
        emit LiveRoomCreated(msg.sender, roomId, title);
    }

    /**
     * @dev Update live room status (creator only)
     */
    function updateLiveRoomStatus(string memory roomId, bool isLive) external {
        if (liveRooms[roomId].creator != msg.sender) revert RoomNotFound();
        
        liveRooms[roomId].isLive = isLive;
        
        emit LiveRoomStatusChanged(roomId, isLive);
    }

    /**
     * @dev Join live room (increment participant count)
     */
    function joinLiveRoom(string memory roomId) external {
        if (bytes(liveRooms[roomId].id).length == 0) revert RoomNotFound();
        if (!liveRooms[roomId].isLive) revert RoomNotLive();
        
        liveRooms[roomId].participantCount++;
        
        emit ParticipantJoined(roomId, msg.sender);
    }

    /**
     * @dev Leave live room (decrement participant count)
     */
    function leaveLiveRoom(string memory roomId) external {
        if (bytes(liveRooms[roomId].id).length > 0 && liveRooms[roomId].participantCount > 0) {
            liveRooms[roomId].participantCount--;
        }
    }

    // ============ TIPPING FUNCTIONS ============

    /**
     * @dev Tip creator directly
     */
    function tipCreator(address creator) external payable {
        if (msg.value == 0) revert InsufficientTip();
        if (creator == msg.sender) revert CannotTipYourself();
        if (bytes(creators[creator].name).length == 0) revert NotRegistered();
        
        creators[creator].totalEarnings += msg.value;
        totalTips += msg.value;
        
        payable(creator).transfer(msg.value);
        
        emit TipSent(msg.sender, creator, msg.value);
    }

    /**
     * @dev Tip specific content
     */
    function tipContent(string memory contentId) external payable {
        if (msg.value == 0) revert InsufficientTip();
        if (bytes(contents[contentId].id).length == 0) revert InvalidInput();
        
        Content storage content = contents[contentId];
        if (content.creator == msg.sender) revert CannotTipYourself();
        
        content.tipsReceived += msg.value;
        creators[content.creator].totalEarnings += msg.value;
        totalTips += msg.value;
        
        payable(content.creator).transfer(msg.value);
        
        emit TipSent(msg.sender, content.creator, msg.value);
    }

    /**
     * @dev Tip during live room
     */
    function tipLiveRoom(string memory roomId) external payable {
        if (msg.value == 0) revert InsufficientTip();
        if (bytes(liveRooms[roomId].id).length == 0) revert RoomNotFound();
        
        LiveRoom storage room = liveRooms[roomId];
        if (room.creator == msg.sender) revert CannotTipYourself();
        if (!room.isLive) revert RoomNotLive();
        
        creators[room.creator].totalEarnings += msg.value;
        totalTips += msg.value;
        
        payable(room.creator).transfer(msg.value);
        
        emit TipSent(msg.sender, room.creator, msg.value);
    }

    // ============ VIEW FUNCTIONS - OPTIMIZED FOR SPEED ============

    /**
     * @dev Get creator info - MVP optimized
     */
    function getCreator(address creator) external view returns (Creator memory) {
        return creators[creator];
    }

    /**
     * @dev Get content info - MVP optimized
     */
    function getContent(string memory contentId) external view returns (Content memory) {
        return contents[contentId];
    }

    /**
     * @dev Get live room info - MVP optimized
     */
    function getLiveRoom(string memory roomId) external view returns (LiveRoom memory) {
        return liveRooms[roomId];
    }

    /**
     * @dev Get creator's content list
     */
    function getCreatorContents(address creator) external view returns (string[] memory) {
        return creatorContents[creator];
    }

    /**
     * @dev Get creator's live rooms
     */
    function getCreatorLiveRooms(address creator) external view returns (string[] memory) {
        return creatorLiveRooms[creator];
    }

    /**
     * @dev Get featured creators - MVP optimized (latest 6 creators)
     */
    function getFeaturedCreators() external view returns (address[] memory) {
        uint256 total = allCreators.length;
        if (total == 0) return new address[](0);
        
        uint256 limit = total > 6 ? 6 : total;
        address[] memory result = new address[](limit);
        
        for (uint256 i = 0; i < limit; i++) {
            result[i] = allCreators[total - 1 - i]; // Latest first
        }
        
        return result;
    }

    /**
     * @dev Get latest 6 content items - MVP optimized for fast rendering
     */
    function getLatestContent() external view returns (string[] memory) {
        uint256 total = allContent.length;
        if (total == 0) return new string[](0);
        
        uint256 limit = total > 6 ? 6 : total;
        string[] memory result = new string[](limit);
        
        for (uint256 i = 0; i < limit; i++) {
            result[i] = allContent[total - 1 - i]; // Latest first
        }
        
        return result;
    }

    /**
     * @dev Get active live rooms - MVP optimized (max 6 for speed)
     */
    function getActiveLiveRooms() external view returns (string[] memory) {
        uint256 count = 0;
        uint256 total = allLiveRooms.length;
        
        // Count active rooms first
        for (uint256 i = 0; i < total; i++) {
            if (liveRooms[allLiveRooms[i]].isLive) {
                count++;
                if (count >= 6) break; // Limit to 6 for speed
            }
        }
        
        if (count == 0) return new string[](0);
        
        string[] memory result = new string[](count);
        uint256 resultIndex = 0;
        
        // Get latest active rooms (reverse order)
        for (uint256 i = total; i > 0 && resultIndex < count; i--) {
            string memory roomId = allLiveRooms[i - 1];
            if (liveRooms[roomId].isLive) {
                result[resultIndex] = roomId;
                resultIndex++;
            }
        }
        
        return result;
    }

    /**
     * @dev Check if creator is registered
     */
    function isCreatorRegistered(address creator) external view returns (bool) {
        return bytes(creators[creator].name).length > 0;
    }

    /**
     * @dev Get platform stats - MVP version
     */
    function getPlatformStats() external view returns (uint256 creatorsCount, uint256 contentCount, uint256 liveRoomsCount, uint256 totalTipsAmount) {
        return (totalCreators, allContent.length, allLiveRooms.length, totalTips);
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @dev Convert uint to string - optimized
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }
}
