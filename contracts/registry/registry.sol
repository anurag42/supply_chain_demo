pragma solidity ^ 0.4 .18;

/**
 * @title - Aadhaar Registry
 * 
 * Simple Registry that stores each user's Ethereum Account Address and Aadhaar KYC hash against unique Aadhaar ID
 */
contract registry {
  address private owner;
  
  /**
   * EVENTS
   */
  event LogSubmitKYC(bytes32 indexed aadhaarID, address ethAddress, bytes aadhaarKYC);
  event LogGetEthAddress(bytes32 indexed aadhaarID, address ethAddress);
  event LogGetKYChash(bytes32 indexed aadhaarID, bytes KYChash);

  /**
   * Constructor of the Registry
   */
  function registry() {
    owner = msg.sender;
  }

  /**
   * The user structure: every registry contract is composed of:
   * @param kyc - Hash of KYC document(i.e., Aadhaar) bytecode
   * @param ethAddress - Ethereum Address of the User
   */
  struct user {
    bytes kyc;
    address ethAddress;
  }

  /**
   * Mapping for contract registry.
   * @param mapping from Aadhaar ID to struct user
   * Details of each and every user are stored against his Aadhaar Number
   */
  mapping(bytes32 => user) userdir;
  
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
   * @param aadhaarID - Unique Aadhaar ID Number
   * @param _userAddress - User's Ethereum Account address
   * @param KYChash - IPFS hash of KYC document(i.e., Aadhaar)
   */
  function submitKYC(bytes32 aadhaarID, address _userAddress, bytes KYChash) returns(bool) {
    require(aadhaarID != '' && aadhaarID.length == 12);
    require(_userAddress != 0x0);
    require(sha3(KYChash) != sha3(''));
    userdir[aadhaarID].kyc = KYChash;
    userdir[aadhaarID].ethAddress = _userAddress;
    /* Event to keep a log of function execution */
    LogSubmitKYC(aadhaarID, _userAddress, KYChash);
  }

  /**
   * Function that returns KYChash corresponding to unique Aadhaar ID
   * @param aadhaarID - Unique Aadhaar ID Number
   */
  function getKYChash(bytes32 aadhaarID) onlyBy() {
    LogGetKYChash(aadhaarID, userdir[aadhaarID].kyc);
  }

  /**
   * Function that returns Ethereum Address corresponding to unique Aadhaar ID
   * @param aadhaarID - Unique Aadhaar ID Number
   */
  function getUserEthAddress(bytes32 aadhaarID) onlyBy() {
    LogGetEthAddress(aadhaarID, userdir[aadhaarID].ethAddress);
  }
  
  /**
   * Function that checks if an user's Aadhaar No. is already registered
   * @param aadhaarID - Unique Aadhaar ID Number
   */
  function isRegistered(bytes32 aadhaarID) returns(bool) {
    return (userdir[aadhaarID].ethAddress != 0x0 && sha3(userdir[aadhaarID].kyc) == sha3(''));
  }
}

