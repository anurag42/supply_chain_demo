pragma solidity ^ 0.4 .11;

/**
 * @title- TradeRegistry contract
 * This contract stores the details of trade - parties involved within,
 * documents exchanged between them as a part 
 * of trade (Request For Quotation, Quotation, PurchaseOrder, Invoice, LetterOfCredit, BillOfLading)
 * 
 * Each document is stored as Hash of its content,
 * to ensure that the contents of doc remain unmodified.
 * 
 * The contract also ensures for guaranteed payment to seller upon trade completion
 **/
contract TradeReg {
  address owner;
  
 /** Sets status for each document being stored in contract
  * Initial Status - NOT_YET_UPLOADED
  * Once Document is uploaded, status would be set to REVIEW_PENDING
  * The Doc would then be reviewed by trade parties and corresponding
  * Approve/Reject action would be carried out.
  **/
  enum docStatus {
    NOT_YET_UPLOADED,
    REVIEW_PENDING,
    PARTIAL_APPROVED,
    APPROVED,
    REJECTED
  }

  /*
      MODIFIERS
    ========================================================================
  */
  /**
   * Set permission so that owner can be the only accessor
   */
  modifier onlyBy() {
    if (msg.sender != owner) {
      throw;
    }
    _;
  }
  
  /**
   * @param versiondir - Stores each document against it's version number
   * @param status - Current Status of each doc involved in the Trade
   * @param version - Indicates the latest version number
   **/
  struct doc {
    mapping(uint => bytes) versiondir;
    docStatus status;
    uint version;
  }
  
  /**
   * @param NoOfDays - 
   * @param creditAmount - Amount guranteed to be paid by the buyer
   * @param status - Current status of Letter of credit contract
   **/
  struct LetterOfCredit {
    uint noOfDays;
    uint creditAmount;
    docStatus status;
  }
  
  /**
   * @param NoOfDays - 
   * @param creditAmount - Amount to be paid by the buyer
   * @param status - Current status of Invoice document
   **/
  struct Invoice {
    uint noOfDays;
    uint creditAmount;
    docStatus status;
    bytes hash;
  }


  /**
   * @param tradeParties - List of all trade parties involved
   * @tradePartiesRole - Stores the role of each party against their Eth Account address
   *                     Role can be buyer, seller, bank, shipper, insurer
   * @docByType - Stores each document deatils against it's docByType
   * @param LetterOfCredit
   * @param invoice
   * @param shippingDate - Date of Shipping
   * @param issueDate - issueDate of LetterOfCredit
   **/
  struct Trade {
    address[] tradeParties;
    mapping(address => bytes32) tradePartiesRole;
    mapping(bytes32 => address) ethAddressByRole;
    mapping(bytes32 => doc) docByType;
    LetterOfCredit loc;
    Invoice invoice;
    uint insuranceAmount;
    uint256 shippingDate;
    uint256 issueDate;
    bool reqstatustoRTO;
    bool reqstatustoInsurer;
  }

  mapping(bytes32 => Trade) trades;

  /**
   EVENTS
  */
  event LogTradeCreated(bytes32 indexed uid);
  event LogUpload(bytes32 indexed uid, bytes32 docName, docStatus status);
  event LogApprove(address indexed sender, bytes32 indexed docName, uint time);
  event LogReject(address indexed sender, bytes32 indexed docName);
  event LogGetDoc(bytes32 indexed uid, bytes hash);
  event LogDeposit(bytes32 indexed uid, uint amount);
  event LogPayment(bytes32 indexed uid, string status);
  event LogSetStatus(bytes32 indexed uid, bool status);
  
  /**
   * Set's owner permissions
   **/
  function TradeReg() {
    owner = msg.sender;
  }
  
  /**
   * @param uid- Unique trade ID
   * @param tradeParties - Parties involved in trade
   * @param tradePartiesRole - Role of parties involved within
   **/
  function createTrade(bytes32 uid, address[] tradeParties, bytes32[] tradePartiesRole) {
    trades[uid].tradeParties = tradeParties;
    for (uint i = 0; i < tradeParties.length; i++) {
      trades[uid].tradePartiesRole[tradeParties[i]] = tradePartiesRole[i];
    }
    LogTradeCreated(uid);
  }
  
  /**
   * @param uid- Unique trade ID
   * Checks for sender upload permissions and then allows trade documents to be stored
   **/
  function upload(bytes32 uid, address sender, bytes32 docType, bytes _hash) {
    bytes32 role = trades[uid].tradePartiesRole[sender];
    if (isUploadAllowed(role, docType)) {
      var currIndex = trades[uid].docByType[docType].version++;
      trades[uid].docByType[docType].versiondir[currIndex] = _hash;
      trades[uid].docByType[docType].status = docStatus.REVIEW_PENDING;
      LogUpload(uid, docType, trades[uid].docByType[docType].status);
    } else return;
  }
  
  function isUploadAllowed(bytes32 role, bytes32 docType) internal returns(bool) {
    bool isAllowed = false;
    if ((role == "buyer" && (docType == "PurchaseOrder" || docType == "RFQ")) ||
      ((role == "seller") && (docType == "Quotation" || docType == "Invoice")) ||
      (role == "shipper" && docType == "BillOfLading") || (role == "insurer" && docType == "InuranceQuotation")) {
      isAllowed = true;
    }
    return isAllowed;
  }
  
  /**
   * @param uid- Unique trade ID
   * Checks for sender upload permissions and then allows trade documents to be stored
   **/
  function uploadLoc(bytes32 uid, uint _invoiceAmount, uint _noOfDays) {
    trades[uid].loc.creditAmount = _invoiceAmount;
    trades[uid].loc.noOfDays = _noOfDays;
    trades[uid].loc.status = docStatus.REVIEW_PENDING;
    LogUpload(uid, "LetterOfCredit", trades[uid].loc.status);
  }
  
  /**
   * @param uid- Unique trade ID
   * Checks for sender upload permissions and then allows trade documents to be stored
   **/
  function uploadInvoice(bytes32 uid, uint _invoiceAmount, uint _noOfDays, bytes _hash) {
    trades[uid].invoice.creditAmount = _invoiceAmount;
    trades[uid].invoice.noOfDays = _noOfDays;
    trades[uid].invoice.status = docStatus.REVIEW_PENDING;
    trades[uid].invoice.hash = _hash;
    LogUpload(uid, "Invoice", trades[uid].invoice.status);
  }
  
  /**
   * @param uid- Unique trade ID
   * @param docType
   * Checks for sender upload permissions and then allows trade documents to be stored
   **/
  function action(bytes32 uid, address sender, bytes32 docType, bytes32 action, bytes extraData) {
    if (action == "Approve") {
      approve(uid, sender, docType);
    } else if (action == "Reject") {
      reject(uid, sender, docType, extraData);
    }
  }
  
  /**
   * @param uid- Unique trade ID
   * @param docType
   * Checks for sender upload permissions and then allows trade documents to be stored
   **/
  function approve(bytes32 uid, address sender, bytes32 docType) internal {
    bytes32 role = trades[uid].tradePartiesRole[sender];
    if (isReviewAllowed(role, docType) && role == "buyer") {
      trades[uid].docByType[docType].status = docStatus.PARTIAL_APPROVED;
      LogApprove(sender, docType, now);
    } else if (isReviewAllowed(role, docType) && role != "buyer") {
        if (role == "seller" && docType == "LetterOfCredit") trades[uid].issueDate = now;
      else if (role == "seller" && docType == "BillOfLading") trades[uid].shippingDate = now;
      trades[uid].docByType[docType].status = docStatus.APPROVED;
      LogApprove(sender, docType, now);
    }
  }
  
  /**
   * @param uid - Unique trade ID
   * @param sender - Eth Address of the sender
   * @param docType - 
   *  Allows trade documents to be stored
   **/
  function reject(bytes32 uid, address sender, bytes32 docType, bytes extraData) internal {
    bytes32 role = trades[uid].tradePartiesRole[sender];
    if (isReviewAllowed(role, docType)) {
      trades[uid].docByType[docType].status = docStatus.REJECTED;
      LogReject(sender, docType);
    } else return;
  }
  
  /**
   * @param role - Unique trade ID
   * @param docType - 
   * Checks for sender upload permissions
   **/
  function isReviewAllowed(bytes32 role, bytes32 docType) internal returns(bool) {
    bool isAllowed = false;
    if (((role == "buyer") && (docType == "Invoice" || docType == "LetterOfCredit" || docType == "BillOfLading")) ||
      (role == "seller" && (docType == "PurchaseOrder" || docType == "LetterOfCredit" || docType == "RFQ")) ||
      (role == "bank" && (docType == "Invoice" || docType == "BillOfLading")) ||
      (role == "buyer" && docType == "Quotation")) {
      isAllowed = true;
    }
    return isAllowed;
  }
  
  /**
   * @param uid- Unique trade ID
   * @param docName - 
   **/
  function getLatestDoc(bytes32 uid, bytes32 docName) returns(bytes) {
    uint latestDocIndex = trades[uid].docByType[docName].version - 1;
    LogGetDoc(uid, trades[uid].docByType[docName].versiondir[latestDocIndex]);
  }
  
  /**
   * @param uid- Unique trade ID
   * @param docName - 
   **/
  function getDoc(bytes32 uid, bytes32 docName, uint version) returns(bytes) {
    return trades[uid].docByType[docName].versiondir[version - 1];
  }
  
  /**
   * @param uid- Unique trade ID
   * Pay amount to seller from contract on guaranteed date
   **/
  function payToSeller(bytes32 uid) {
    if (now > trades[uid].shippingDate + trades[uid].loc.noOfDays && trades[uid].shippingDate < (trades[uid].issueDate + trades[uid].loc.noOfDays)) {
      trades[uid].ethAddressByRole["seller"].transfer(trades[uid].loc.creditAmount);
      LogPayment(uid, "True");
    }
    LogPayment(uid, "False");
  }
  
  /**
   * @param uid- Unique trade ID
   **/
  function payToInsurer(bytes32 uid) {
      trades[uid].ethAddressByRole["insurer"].transfer(trades[uid].insuranceAmount);
      LogPayment(uid, "True");
  }
  
  /**
   * @param uid- Unique trade ID
   **/
  function setStatusForInsurer(bytes32 uid, bool status){
      trades[uid].reqstatustoInsurer;
      LogSetStatus(uid, status);
  }
  
  /**
   * @param uid- Unique trade ID
   **/
  function setStatusForRTO(bytes32 uid, bool status){
      trades[uid].reqstatustoRTO;
  }
  
  /**
   * @param uid- Unique trade ID
   * Deposit Ether to the contract
   **/
  function deposit(bytes32 uid) payable {
    LogDeposit(uid, msg.value);
  }
}
