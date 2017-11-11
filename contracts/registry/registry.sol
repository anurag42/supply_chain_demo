pragma solidity ^0.4.18;

/**
 * @title - Aadhaar Registry
 *
 * Simple Registry that stores each user's Aadhaar ID and Aadhaar KYC hash against unique Ethereum Address
 */
contract registry {
  address private owner;

  /**
   * EVENTS
   */
  event LogSubmitKYC(address indexed ethAddress, bytes32 indexed aadhaarID, bytes aadhaarKYC);
  event LogGetEthAddress(address indexed ethAddress, bytes32 indexed aadhaarID);
  event LogGetKYChash(address indexed ethAddress, bytes KYChash);

  /**
   * Constructor of the Registry
   */
  function registry() {
    owner = msg.sender;
  }

  /**
   * The user structure: every registry contract is composed of:
   * @param kyc - Hash of KYC document(i.e., Aadhaar) bytecode
   * @param aadhaarID - Unique Aadhaar ID Number
   */
  struct user {
    bytes kyc;
    bytes32 aadhaarID;
  }

  /**
   * Mapping for contract registry.
   * @param mapping from Ethereum Address to struct user
   * Details of each and every user are stored against his unique Ethereum Address
   */
  mapping(address => user) userdir;
  mapping(bytes32 => address) aadhaarToEthAddr;

  /*
      MODIFIERS
    ========================================================================
  */
  /**
   * Set permission so that owner can be the only accessor
   */
  modifier onlyBy() {
    require(msg.sender == owner);
    _;
  }


  /**
   * User can submit a KYC document for acceptance into registry.
   * @param aadhaarID - Aadhaar ID Number
   * @param _userAddress - User's Ethereum Account address
   * @param KYChash - IPFS hash of KYC document(i.e., Aadhaar)
   */
  function submitKYC(address _userAddress, bytes32 aadhaarID, bytes KYChash) returns(bool) {
    require(_userAddress != 0x0);
    require(sha3(KYChash) != sha3(''));
    userdir[_userAddress].kyc = KYChash;
    userdir[_userAddress].aadhaarID = aadhaarID;
    /* Event to keep a log of function execution */
    LogSubmitKYC(_userAddress, aadhaarID, KYChash);
  }

  /**
   * Function that returns KYChash corresponding to unique Ethereum Address
   * @param _userAddress - User's Ethereum Account address
   */
  function getKYChash(address _userAddress) onlyBy() {
    LogGetKYChash(_userAddress, userdir[_userAddress].kyc);
  }
  
  /**
   * Function that returns Ethereum Address corresponding to unique Ethereum Address
   * @param _userAddress - User's Ethereum Account address
   */
  function getUserAadhaarID(address _userAddress) onlyBy() {
    LogGetEthAddress(_userAddress, userdir[_userAddress].aadhaarID);
  }

  /**
   * Function that checks if an user's Aadhaar No. is already registered
   * @param aadhaarID - Unique Aadhaar ID Number
   */
  function isRegistered(bytes32 aadhaarID) returns(bool) {
    return (aadhaarToEthAddr[aadhaarID] != 0x0 && sha3(userdir[aadhaarToEthAddr[aadhaarID]].kyc) == sha3(''));
  }
}

