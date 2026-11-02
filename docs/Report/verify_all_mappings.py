import pypdf
import re
import sys

def verify_all():
    pdf_path = 'docs/Report/VideoSense_AI_Sem5_Project_Report.pdf'
    reader = pypdf.PdfReader(pdf_path)
    total_pages = len(reader.pages)
    print(f"Total PDF pages: {total_pages}")
    
    pages_text = [p.extract_text() or "" for p in reader.pages]
    
    # Identify Chapter 1 physical page
    ch1_phys = None
    for i in range(4, total_pages):
        lines = [l.strip() for l in pages_text[i].split('\n') if l.strip()]
        if any(l == "CHAPTER 1" or l.startswith("CHAPTER 1") for l in lines):
            ch1_phys = i + 1
            break
            
    print(f"Chapter 1 starts at physical page: {ch1_phys}")
    
    def phys_to_arabic(p_idx):
        return str((p_idx + 1) - (ch1_phys - 1))
        
    roman_map = {1: "i", 2: "ii", 3: "iii", 4: "iv", 5: "v", 6: "vi", 7: "vii", 8: "viii", 9: "ix", 10: "x"}
    def phys_to_roman(p_idx):
        return roman_map.get(p_idx + 1, str(p_idx + 1))
        
    def find_prelim(pat):
        for i in range(ch1_phys - 1):
            if i in [4, 5]: # skip TOC pages 5 & 6
                continue
            for l in pages_text[i].split('\n'):
                if re.search(pat, " ".join(l.split()), re.IGNORECASE):
                    return phys_to_roman(i)
        return "NOT_FOUND"

    def find_body(pat):
        for i in range(ch1_phys - 1, total_pages):
            for l in pages_text[i].split('\n'):
                if re.search(pat, " ".join(l.split()), re.IGNORECASE):
                    return phys_to_arabic(i)
        return "NOT_FOUND"

    # Expected list from TOC
    expected_toc = [
        ("ACKNOWLEDGEMENT", find_prelim(r"^ACKNOWLEDGEMENT"), "iii"),
        ("ABSTRACT", find_prelim(r"^ABSTRACT"), "iv"),
        ("LIST OF FIGURES", find_prelim(r"^LIST OF FIGURES"), "vii"),
        ("LIST OF TABLES", find_prelim(r"^LIST OF TABLES"), "viii"),
        ("1 INTRODUCTION", find_body(r"^CHAPTER 1"), "1"),
        ("1.1 MOTIVATION", find_body(r"^1\.1\s+MOTIVATION"), "2"),
        ("1.2 SCOPE OF THE PROJECT", find_body(r"^1\.2\s+SCOPE"), "3"),
        ("1.3 ORGANISATION OF THE REPORT", find_body(r"^1\.3\s+ORGANISATION"), "4"),
        ("2 LITERATURE REVIEW", find_body(r"^CHAPTER 2"), "6"),
        ("2.1 VIDEO UNDERSTANDING AND FRAME SAMPLING", find_body(r"^2\.1\s+VIDEO UNDERSTANDING"), "6"),
        ("2.2 OBJECT DETECTION: YOLO-BASED METHODS", find_body(r"^2\.2\s+OBJECT DETECTION"), "7"),
        ("2.3 OPEN-VOCABULARY DETECTION WITH GROUNDING DINO", find_body(r"^2\.3\s+OPEN-VOCABULARY"), "8"),
        ("2.4 NATURAL LANGUAGE PROCESSING FOR CONTEXT SUMMARIZATION", find_body(r"^2\.4\s+NATURAL LANGUAGE"), "10"),
        ("2.5 SUMMARY OF RELATED RESEARCH WORK", find_body(r"^2\.5\s+SUMMARY"), "11"),
        ("3 SYSTEM ANALYSIS", find_body(r"^CHAPTER 3"), "13"),
        ("3.1 PROBLEM DEFINITION", find_body(r"^3\.1\s+PROBLEM DEFINITION"), "13"),
        ("3.2 OBJECTIVES OF THE PROPOSED SYSTEM", find_body(r"^3\.2\s+OBJECTIVES"), "14"),
        ("3.3 EXISTING SYSTEM AND ANALYSIS", find_body(r"^3\.3\s+EXISTING SYSTEM"), "15"),
        ("3.4 PROPOSED SYSTEM OVERVIEW", find_body(r"^3\.4\s+PROPOSED SYSTEM"), "15"),
        ("3.5 FUNCTIONAL REQUIREMENTS", find_body(r"^3\.5\s+FUNCTIONAL"), "16"),
        ("3.6 NON-FUNCTIONAL REQUIREMENTS", find_body(r"^3\.6\s+NON-FUNCTIONAL"), "16"),
        ("3.7 TECHNOLOGY JUSTIFICATION", find_body(r"^3\.7\s+TECHNOLOGY"), "17"),
        ("4 SYSTEM DESIGN", find_body(r"^CHAPTER 4"), "18"),
        ("4.1 DESIGN APPROACH", find_body(r"^4\.1\s+DESIGN APPROACH"), "18"),
        ("4.2 DATA AND OUTPUT STRUCTURE", find_body(r"^4\.2\s+DATA AND OUTPUT"), "19"),
        ("4.3 SYSTEM COMPONENTS OVERVIEW", find_body(r"^4\.3\s+SYSTEM COMPONENTS"), "20"),
        ("4.4 DATA FLOW DESCRIPTION", find_body(r"^4\.4\s+DATA FLOW"), "20"),
        ("5 SYSTEM IMPLEMENTATION", find_body(r"^CHAPTER 5"), "22"),
        ("5.1 IMPLEMENTATION OVERVIEW", find_body(r"^5\.1\s+IMPLEMENTATION"), "22"),
        ("5.2 CORE ALGORITHM AND PROCESSING PIPELINE", find_body(r"^5\.2\s+CORE ALGORITHM"), "22"),
        ("5.3 EXECUTION WORKFLOW", find_body(r"^5\.3\s+EXECUTION WORKFLOW"), "24"),
        ("5.4 DATASET AND MODEL IMPROVEMENT STRATEGIES", find_body(r"^5\.4\s+DATASET"), "25"),
        ("6 RESULT AND DISCUSSION", find_body(r"^CHAPTER 6"), "26"),
        ("6.1 FUNCTIONAL RESULT REVIEW", find_body(r"^6\.1\s+FUNCTIONAL RESULT"), "26"),
        ("6.2 DISCUSSION OF DETECTION MODELS", find_body(r"^6\.2\s+DISCUSSION OF DETECTION"), "27"),
        ("6.3 DISCUSSION OF CONTEXT SUMMARIZATION", find_body(r"^6\.3\s+DISCUSSION OF CONTEXT"), "27"),
        ("6.4 BENCHMARKING AND PERFORMANCE METRICS", find_body(r"^6\.4\s+BENCHMARKING"), "27"),
        ("7 CONCLUSION AND FUTURE ENHANCEMENTS", find_body(r"^CHAPTER 7"), "30"),
        ("7.1 CONCLUSION", find_body(r"^7\.1\s+CONCLUSION"), "30"),
        ("7.2 LIMITATIONS OF THE SYSTEM", find_body(r"^7\.2\s+LIMITATIONS"), "31"),
        ("7.3 FUTURE ENHANCEMENT", find_body(r"^7\.3\s+FUTURE ENHANCEMENT"), "31"),
        ("REFERENCES", find_body(r"^REFERENCES"), "33"),
        ("APPENDIX - 1", find_body(r"^APPENDIX - 1"), "35"),
        ("APPENDIX - 2", find_body(r"^APPENDIX - 2"), "44")
    ]

    print("\n" + "="*80)
    print("TABLE OF CONTENTS ACCURACY VERIFICATION")
    print("="*80)
    toc_errors = 0
    for name, actual, listed in expected_toc:
        match = (actual == listed)
        if not match:
            toc_errors += 1
        status = "PASSED" if match else "FAILED"
        print(f"[{status}] {name:55s} | Listed: {listed:5s} | Actual: {actual:5s}")

    expected_figs = [
        ("Figure 2.1", find_body(r"Figure 2\.1"), "7"),
        ("Figure 2.2", find_body(r"Figure 2\.2"), "8"),
        ("Figure 2.3", find_body(r"Figure 2\.3"), "9"),
        ("Figure 2.4", find_body(r"Figure 2\.4"), "11"),
        ("Figure 4.1", find_body(r"Figure 4\.1"), "19"),
        ("Figure 4.2", find_body(r"Figure 4\.2"), "20"),
        ("Figure 5.1", find_body(r"Figure 5\.1"), "24"),
        ("Figure 7.1", find_body(r"Figure 7\.1"), "30"),
        ("Figure 1.1", find_body(r"Figure 1\.1"), "35"),
        ("Figure 1.2", find_body(r"Figure 1\.2"), "36"),
        ("Figure 1.3", find_body(r"Figure 1\.3"), "37"),
        ("Figure 1.4", find_body(r"Figure 1\.4"), "38"),
        ("Figure 1.5", find_body(r"Figure 1\.5"), "39"),
        ("Figure 1.6", find_body(r"Figure 1\.6"), "40"),
        ("Figure 1.7", find_body(r"Figure 1\.7"), "41"),
        ("Figure 1.8", find_body(r"Figure 1\.8"), "42"),
        ("Figure 1.9", find_body(r"Figure 1\.9"), "43")
    ]

    print("\n" + "="*80)
    print("LIST OF FIGURES ACCURACY VERIFICATION")
    print("="*80)
    fig_errors = 0
    for name, actual, listed in expected_figs:
        match = (actual == listed)
        if not match:
            fig_errors += 1
        status = "PASSED" if match else "FAILED"
        print(f"[{status}] {name:20s} | Listed: {listed:5s} | Actual: {actual:5s}")

    expected_tbls = [
        ("Table 2.1", find_body(r"Table 2\.1:"), "12"),
        ("Table 3.1", find_body(r"Table 3\.1:"), "16"),
        ("Table 3.2", find_body(r"Table 3\.2:"), "17"),
        ("Table 3.3", find_body(r"Table 3\.3:"), "17"),
        ("Table 4.1", find_body(r"Table 4\.1:"), "20"),
        ("Table 4.2", find_body(r"Table 4\.2:"), "20"),
        ("Table 6.1", find_body(r"Table 6\.1:"), "27"),
        ("Table 6.2", find_body(r"Table 6\.2:"), "28"),
        ("Table 6.3", find_body(r"Table 6\.3:"), "28"),
        ("Table 6.4", find_body(r"Table 6\.4:"), "28")
    ]

    print("\n" + "="*80)
    print("LIST OF TABLES ACCURACY VERIFICATION")
    print("="*80)
    tbl_errors = 0
    for name, actual, listed in expected_tbls:
        match = (actual == listed)
        if not match:
            tbl_errors += 1
        status = "PASSED" if match else "FAILED"
        print(f"[{status}] {name:20s} | Listed: {listed:5s} | Actual: {actual:5s}")

    print("\n" + "="*80)
    print(f"SUMMARY: TOC Errors: {toc_errors}, Figure Errors: {fig_errors}, Table Errors: {tbl_errors}")
    print("="*80)
    if toc_errors == 0 and fig_errors == 0 and tbl_errors == 0:
        print("PERFECT 100% ACCURACY! ALL PAGE NUMBERS MATCH INSIDE PAGES EXACTLY!")
    else:
        print("VERIFICATION FAILED: Discrepancies detected!")

if __name__ == '__main__':
    verify_all()

