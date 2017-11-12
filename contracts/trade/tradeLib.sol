pragma solidity ^ 0.4 .11;

library TradeLib {

  enum docStatus {
    NOT_YET_UPLOADED,
    REVIEW_PENDING,
    PARTIAL_APPROVED,
    APPROVED,
    REJECTED
  }

  struct doc {
    mapping(uint => bytes) versiondir;
    docStatus status;
    uint version;
  }
  
  struct LetterOfCredit {
		uint noOfDays;
		uint creditAmount;
		docStatus status;
	}
	
	struct Invoice {
		uint noOfDays;
		uint creditAmount;
		docStatus status;
	}
	
  struct Trade {
    address[] tradeParties;
    mapping(address => bytes32) tradePartiesRole;
    mapping(bytes32 => address) ethAddressByRole;
    bytes32[] doctype;
    mapping(bytes32 => doc) docByType;
    LetterOfCredit loc;
    Invoice invoice;
    uint256 amount;
    uint256 expiresOn;
    uint256 shippingDate;
    uint256 issueDate;
  }
  
  /**
   EVENTS
  */
  event LogUpload(bytes32 docName, bytes hash, docStatus status);
  event LogApprove(address indexed sender, bytes32 indexed docName);
  event LogReject(address indexed sender, bytes32 indexed docName);

  function initDocs(Trade storage self, bytes32[] docs) {
    for (uint i = 0; i < docs.length; i++) {
      self.docByType[docs[i]].status = docStatus.NOT_YET_UPLOADED;
    }
  }

  function upload(Trade storage self, address sender, bytes32 docType, bytes _hash) {
    bytes32 role = self.tradePartiesRole[sender];
    if (isUploadAllowed(role, docType)) {
      var currIndex = self.docByType[docType].version++;
      self.docByType[docType].versiondir[currIndex] = _hash;
      self.docByType[docType].status = docStatus.REVIEW_PENDING;
      LogUpload(docType, self.docByType[docType].versiondir[currIndex], self.docByType[docType].status);
    } else return;
  }
  
  function isUploadAllowed(bytes32 role, bytes32 docType) internal returns(bool) {
      bool isAllowed = false;
      if ((role == "buyer" && docType == "PurchaseOrder") 
            || ((role == "seller") && (docType == "Quotation" || docType == "Invoice")) 
            || (role == "shipper" && docType == "BillOfLading")) {
                isAllowed = true;
            }
       return isAllowed;
  }
  
  function uploadLoc(Trade storage self, uint _invoiceAmount, uint _noOfDays){
      self.invoice.creditAmount = _invoiceAmount;
      self.invoice.noOfDays = _noOfDays;
      self.invoice.status = docStatus.REVIEW_PENDING;
  }
  
  function uploadInvoice(Trade storage self, uint _invoiceAmount, uint _noOfDays){
      self.loc.creditAmount = _invoiceAmount;
      self.loc.noOfDays = _noOfDays;
      self.loc.status = docStatus.REVIEW_PENDING;
  }

  function action(Trade storage self, address sender, bytes32 docType, bytes32 action, bytes extraData) {
    if (action == "Approve") {
      approve(self, sender, docType);
    } else if (action == "Reject") {
      reject(self, sender, docType, extraData);
    }
  }

  function approve(Trade storage self, address sender, bytes32 docType) internal {
    bytes32 role = self.tradePartiesRole[sender];
    if (isReviewAllowed(role, docType) && role == "buyer") {
      self.docByType[docType].status = docStatus.PARTIAL_APPROVED;
      LogApprove(sender, docType);
    } else if (isReviewAllowed(role, docType) && role != "buyer") {
        if(role == "seller" && docType == "BillOfLading") self.issueDate = now;
      self.docByType[docType].status = docStatus.APPROVED;
      LogApprove(sender, docType);
    }
  }

  function reject(Trade storage self, address sender, bytes32 docType, bytes extraData) internal {
    bytes32 role = self.tradePartiesRole[sender];
    if (isReviewAllowed(role, docType)) {
      self.docByType[docType].status = docStatus.REJECTED;
      LogReject(sender, docType);
    } else return;
  }
  
  function isReviewAllowed(bytes32 role, bytes32 docType) internal returns(bool) {
      bool isAllowed = false;
      if (((role == "buyer") && (docType == "Invoice" ||docType == "LetterOfCredit" || docType == "BillOfLading")) 
        || (role == "seller" && (docType == "PurchaseOrder" || docType == "LetterOfCredit")) 
        || (role == "buyerBank" && (docType == "Invoice" || docType == "BillOfLading")) 
        || (role == "buyer" && docType == "Quotation")) {
                isAllowed = true;
            }
       return isAllowed;
  }
  
  function getLatestDoc(Trade storage self, bytes32 docName) {
    uint latestDocIndex = self.docByType[docName].version;
    self.docByType[docName].versiondir[latestDocIndex];
  }

  function getDoc(Trade storage self, bytes32 docName, uint version) returns(bytes) {
    return self.docByType[docName].versiondir[version];
  }
  
  function payToSeller(Trade storage self){
      self.ethAddressByRole["seller"].send(self.loc.creditAmount);
  }
}
